import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET debe tener al menos 32 bytes.');
        }

        return {
          secret,
          signOptions: {
            algorithm: 'HS256' as const,
            expiresIn: '1h' as const,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          },
          verifyOptions: {
            algorithms: ['HS256'] as const,
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
  ],
})
export class AuthModule {}
