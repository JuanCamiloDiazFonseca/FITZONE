import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      const data = await this.prisma.plan.findMany({
        select: {
          id: true,
          type: true,
          durationDays: true,
          price: true,
        },
        orderBy: { type: 'asc' },
      });

      return { data };
    } catch {
      throw new InternalServerErrorException(
        'No se pudieron consultar los planes.',
      );
    }
  }
}
