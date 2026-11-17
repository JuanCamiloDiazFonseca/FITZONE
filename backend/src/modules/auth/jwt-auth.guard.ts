import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JWT_AUDIENCE, JWT_ISSUER, SESSION_COOKIE_NAME } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ROLES_KEY, type AppRole } from './roles.decorator';

type AuthenticatedRequest = Request & { user?: { sub: string; email: string; role: AppRole } };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (!token) throw new UnauthorizedException('Debes iniciar sesiÃ³n.');
    try {
      const claims = await this.jwtService.verifyAsync<{ sub?: unknown; email?: unknown; role?: unknown }>(decodeURIComponent(token.slice(SESSION_COOKIE_NAME.length + 1)), {
        issuer: JWT_ISSUER, audience: JWT_AUDIENCE, algorithms: ['HS256'],
      });
      if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string' || (claims.role !== undefined && claims.role !== 'ADMIN' && claims.role !== 'CUSTOMER')) throw new UnauthorizedException();
      // Tokens issued to the administrator before role claims were introduced remain admin-only.
      const role: AppRole = claims.role === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN';
      request.user = { sub: claims.sub, email: claims.email, role };
      const allowed = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
      if (allowed?.length && !allowed.includes(role)) throw new ForbiddenException('No tienes permisos para esta operaciÃ³n.');
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('La sesiÃ³n no es vÃ¡lida o ha expirado.');
    }
  }
}
