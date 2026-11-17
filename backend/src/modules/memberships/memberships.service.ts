import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMembershipDto } from './dto/create-membership.dto';
import {
  ListMembershipsQueryDto,
  MembershipQueryStatus,
} from './dto/list-memberships-query.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

const membershipRelations = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
  plan: {
    select: {
      id: true,
      type: true,
      durationDays: true,
      price: true,
    },
  },
} satisfies Prisma.MembershipInclude;

type MembershipWithRelations = Prisma.MembershipGetPayload<{
  include: typeof membershipRelations;
}>;

type MembershipClassification = MembershipQueryStatus;

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMembershipDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('No se encontró el usuario indicado.');
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id: input.planId },
        select: { id: true, durationDays: true, price: true },
      });
      if (!plan) {
        throw new NotFoundException('No se encontró el plan indicado.');
      }

      const startDate = new Date(input.startDate);
      const membership = await this.prisma.membership.create({
        data: {
          userId: user.id,
          planId: plan.id,
          startDate,
          expirationDate: this.calculateExpirationDate(startDate, plan.durationDays),
          amount: plan.price,
          status: input.status,
        },
        include: membershipRelations,
      });

      return this.withClassification(membership, new Date());
    } catch (error) {
      this.handlePersistenceError(error, 'No se pudo registrar la membresía.');
    }
  }

  async findAll(query: ListMembershipsQueryDto) {
    const referenceTime = new Date();
    const upcomingUntil = new Date(
      referenceTime.getTime() + 5 * 24 * 60 * 60 * 1000,
    );
    const where = this.buildStatusFilter(query.status, referenceTime, upcomingUntil);
    const skip = (query.page - 1) * query.limit;

    try {
      const [memberships, total] = await this.prisma.$transaction([
        this.prisma.membership.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: [{ expirationDate: 'asc' }, { id: 'asc' }],
          include: membershipRelations,
        }),
        this.prisma.membership.count({ where }),
      ]);

      return {
        data: memberships.map((membership) =>
          this.withClassification(membership, referenceTime, upcomingUntil),
        ),
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      this.handlePersistenceError(error, 'No se pudieron consultar las membresías.');
    }
  }

  async update(id: string, input: UpdateMembershipDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }

    try {
      const existing = await this.prisma.membership.findUnique({
        where: { id },
        include: membershipRelations,
      });
      if (!existing) {
        throw new NotFoundException('No se encontró la membresía indicada.');
      }

      const selectedPlan = input.planId && input.planId !== existing.planId
        ? await this.prisma.plan.findUnique({
            where: { id: input.planId },
            select: { id: true, durationDays: true, price: true },
          })
        : existing.plan;
      if (!selectedPlan) {
        throw new NotFoundException('No se encontró el plan indicado.');
      }

      const planChanged = selectedPlan.id !== existing.planId;
      const startDate = input.startDate
        ? new Date(input.startDate)
        : existing.startDate;
      const data: Prisma.MembershipUncheckedUpdateInput = {};

      if (input.status !== undefined) data.status = input.status;
      if (input.startDate !== undefined) data.startDate = startDate;
      if (planChanged) {
        data.planId = selectedPlan.id;
        data.amount = selectedPlan.price;
      }
      if (planChanged || input.startDate !== undefined) {
        data.expirationDate = this.calculateExpirationDate(
          startDate,
          selectedPlan.durationDays,
        );
      }

      const updated = await this.prisma.membership.update({
        where: { id },
        data,
        include: membershipRelations,
      });

      return this.withClassification(updated, new Date());
    } catch (error) {
      this.handlePersistenceError(error, 'No se pudo actualizar la membresía.');
    }
  }

  private buildStatusFilter(
    status: MembershipQueryStatus | undefined,
    referenceTime: Date,
    upcomingUntil: Date,
  ): Prisma.MembershipWhereInput {
    switch (status) {
      case MembershipQueryStatus.CANCELLED:
        return { status: MembershipStatus.CANCELLED };
      case MembershipQueryStatus.EXPIRED:
        return {
          status: MembershipStatus.ACTIVE,
          expirationDate: { lt: referenceTime },
        };
      case MembershipQueryStatus.UPCOMING:
        return {
          status: MembershipStatus.ACTIVE,
          expirationDate: { gte: referenceTime, lte: upcomingUntil },
        };
      case MembershipQueryStatus.ACTIVE:
        return {
          status: MembershipStatus.ACTIVE,
          expirationDate: { gt: upcomingUntil },
        };
      default:
        return {};
    }
  }

  private withClassification(
    membership: MembershipWithRelations,
    referenceTime: Date,
    upcomingUntil = new Date(referenceTime.getTime() + 5 * 24 * 60 * 60 * 1000),
  ) {
    return {
      ...membership,
      status: this.classifyStatus(membership, referenceTime, upcomingUntil),
    };
  }

  private classifyStatus(
    membership: MembershipWithRelations,
    referenceTime: Date,
    upcomingUntil: Date,
  ): MembershipClassification {
    if (membership.status === MembershipStatus.CANCELLED) {
      return MembershipQueryStatus.CANCELLED;
    }
    if (membership.expirationDate < referenceTime) {
      return MembershipQueryStatus.EXPIRED;
    }
    if (membership.expirationDate <= upcomingUntil) {
      return MembershipQueryStatus.UPCOMING;
    }
    return MembershipQueryStatus.ACTIVE;
  }

  private calculateExpirationDate(startDate: Date, durationDays: number): Date {
    const expirationDate = new Date(startDate);
    expirationDate.setUTCDate(expirationDate.getUTCDate() + durationDays);
    return expirationDate;
  }

  private handlePersistenceError(error: unknown, message: string): never {
    if (error instanceof HttpException) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundException('No se encontró el registro solicitado.');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Una de las relaciones indicadas ya no está disponible.',
        );
      }
    }

    throw new InternalServerErrorException(message);
  }
}
