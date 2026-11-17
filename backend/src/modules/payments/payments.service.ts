import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

const paymentRelations = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
  membership: {
    select: {
      id: true,
      startDate: true,
      expirationDate: true,
      amount: true,
      plan: {
        select: {
          id: true,
          type: true,
          durationDays: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreatePaymentDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('No se encontró el usuario indicado.');
      }

      const membership = await this.prisma.membership.findUnique({
        where: { id: input.membershipId },
        select: { id: true, userId: true },
      });
      if (!membership) {
        throw new NotFoundException('No se encontró la membresía indicada.');
      }
      if (membership.userId !== user.id) {
        throw new BadRequestException(
          'La membresía seleccionada no pertenece al usuario indicado.',
        );
      }

      return await this.prisma.payment.create({
        data: {
          user: { connect: { id: user.id } },
          membership: {
            connect: {
              id_userId: { id: membership.id, userId: user.id },
            },
          },
          paidAt: new Date(input.paidAt),
          amount: new Prisma.Decimal(input.amount),
          method: input.method,
        },
        include: paymentRelations,
      });
    } catch (error) {
      this.handlePersistenceError(error, 'No se pudo registrar el pago.');
    }
  }

  async findAll(query: ListPaymentsQueryDto) {
    const skip = (query.page - 1) * query.limit;

    try {
      const [data, total] = await this.prisma.$transaction([
        this.prisma.payment.findMany({
          skip,
          take: query.limit,
          orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
          include: paymentRelations,
        }),
        this.prisma.payment.count(),
      ]);

      return {
        data,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      this.handlePersistenceError(error, 'No se pudieron consultar los pagos.');
    }
  }

  private handlePersistenceError(error: unknown, message: string): never {
    if (error instanceof HttpException) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'El usuario o la membresía indicada ya no está disponible o no corresponde.',
        );
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('No se encontró uno de los registros indicados.');
      }
    }

    throw new InternalServerErrorException(message);
  }
}
