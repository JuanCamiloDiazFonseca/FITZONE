import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly safeUserSelect = { id: true, name: true, document: true, phone: true, email: true, createdAt: true } as const;

  async create(user: CreateUserDto) {
    if (await this.prisma.admin.findFirst({ where: { email: { equals: user.email.trim(), mode: 'insensitive' } }, select: { id: true } })) {
      throw new ConflictException('Ese correo ya está asociado a una cuenta administrativa.');
    }
    try {
      return await this.prisma.user.create({ data: { ...user, email: user.email.trim().toLowerCase() }, select: this.safeUserSelect });
    } catch (error) {
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const skip = (pagination.page - 1) * pagination.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: pagination.limit,
        orderBy: { name: 'asc' },
        select: this.safeUserSelect,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: this.safeUserSelect });
    if (!user) {
      throw new NotFoundException('No se encontró el usuario.');
    }

    return user;
  }

  async update(id: string, user: UpdateUserDto) {
    if (user.email && await this.prisma.admin.findFirst({ where: { email: { equals: user.email.trim(), mode: 'insensitive' } }, select: { id: true } })) {
      throw new ConflictException('Ese correo ya está asociado a una cuenta administrativa.');
    }
    try {
      return await this.prisma.user.update({ where: { id }, data: { ...user, ...(user.email ? { email: user.email.trim().toLowerCase() } : {}) }, select: this.safeUserSelect });
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('No se encontró el usuario.');
      }
      this.handleUniqueConstraint(error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { message: 'Usuario eliminado correctamente.' };
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('No se encontró el usuario.');
      }
      if (
        this.isPrismaError(error, 'P2003') ||
        this.isPrismaError(error, 'P2014')
      ) {
        throw new ConflictException(
          'No se puede eliminar el usuario porque tiene membresías o pagos asociados.',
        );
      }
      throw error;
    }
  }

  private handleUniqueConstraint(error: unknown): void {
    if (this.isPrismaError(error, 'P2002')) {
      throw new ConflictException(
        'Ya existe un usuario con ese documento o correo electrónico.',
      );
    }
  }

  private isPrismaError(
    error: unknown,
    code: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }
}
