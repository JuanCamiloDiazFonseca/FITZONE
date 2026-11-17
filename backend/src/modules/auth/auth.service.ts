import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';
import { RegisterDto } from './dto/register.dto';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(private readonly prisma: PrismaService, private readonly jwtService: JwtService) {}

  async signIn(credentials: SignInDto) {
    if (Buffer.byteLength(credentials.password, 'utf8') > 72) {
      throw new UnauthorizedException('Correo o contrase\u00f1a incorrectos.');
    }
    const email = credentials.email.trim().toLowerCase();
    const admin = await this.prisma.admin.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, passwordHash: true },
    });
    const customer = admin ? null : await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, passwordHash: true },
    });
    const passwordHash = admin?.passwordHash ?? customer?.passwordHash ?? await this.getDummyHash();
    const passwordMatches = await bcrypt.compare(credentials.password, passwordHash);
    if ((!admin && (!customer?.passwordHash || !customer)) || !passwordMatches) {
      throw new UnauthorizedException('Correo o contrase\u00f1a incorrectos.');
    }

    const role = admin ? 'ADMIN' : 'CUSTOMER';
    const account = admin ?? customer!;
    const accessToken = await this.jwtService.signAsync(
      { sub: account.id, email: account.email, role },
      { algorithm: 'HS256', expiresIn: '1h', issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
    );
    return {
      accessToken,
      role,
      account: { id: account.id, email: account.email, ...(role === 'CUSTOMER' ? { name: (account as { name: string }).name } : {}) },
    };
  }

  async register(input: RegisterDto) {
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim()) throw new BadRequestException('El nombre es obligatorio.');
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new BadRequestException('La contrase\u00f1a debe tener como m\u00e1ximo 72 bytes.');
    }
    const admin = await this.prisma.admin.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true },
    });
    if (admin) throw new ConflictException('Ya existe una cuenta con ese correo electr\u00f3nico.');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, passwordHash: true },
    });
    if (existing) {
      if (existing.passwordHash) throw new ConflictException('Ya existe una cuenta con ese correo electr\u00f3nico.');
      const activated = await this.prisma.user.updateMany({ where: { id: existing.id, passwordHash: null }, data: { passwordHash } });
      if (activated.count !== 1) throw new ConflictException('La cuenta ya tiene credenciales de acceso.');
      return this.prisma.user.findUniqueOrThrow({ where: { id: existing.id }, select: { id: true, name: true, email: true, createdAt: true } });
    }

    try {
      return await this.prisma.user.create({
        data: { name: input.name.trim(), email, passwordHash },
        select: { id: true, name: true, email: true, createdAt: true },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Ya existe una cuenta con ese correo electr\u00f3nico.');
      }
      throw error;
    }
  }

  async customerOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, createdAt: true,
        memberships: {
          orderBy: [{ startDate: 'desc' }, { id: 'desc' }], take: 1,
          include: { plan: { select: { type: true, durationDays: true, price: true } } },
        },
        payments: {
          orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
          select: { id: true, paidAt: true, amount: true, method: true, membership: { select: { plan: { select: { type: true } } } } },
        },
      },
    });
    if (!user) throw new NotFoundException('No se encontr\u00f3 la cuenta.');
    return user;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash(randomBytes(32).toString('hex'), 12);
    return this.dummyHash;
  }
}
