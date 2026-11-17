import { Body, Controller, Get, Header, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { RegisterDto } from './dto/register.dto';
import { JWT_LIFETIME_MS, SESSION_COOKIE_NAME } from './auth.constants';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() input: RegisterDto) { return this.authService.register(input); }

  @Public()
  @Post('login')
  async signIn(@Body() credentials: SignInDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signIn(credentials);
    response.cookie(SESSION_COOKIE_NAME, result.accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: JWT_LIFETIME_MS,
    });
    response.setHeader('Cache-Control', 'no-store');
    return { message: 'Inicio de sesiÃ³n correcto.', role: result.role, account: result.account };
  }

  @Get('session')
  @Header('Cache-Control', 'no-store')
  session(@Req() request: Request & { user?: { sub: string; email: string; role: string } }) {
    return { authenticated: true, role: request.user?.role, account: { id: request.user?.sub, email: request.user?.email } };
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @Roles('CUSTOMER')
  me(@Req() request: Request & { user: { sub: string } }) { return this.authService.customerOverview(request.user.sub); }

  @Public()
  @Post('logout')
  signOut(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    response.setHeader('Cache-Control', 'no-store');
    return { message: 'SesiÃ³n cerrada correctamente.' };
  }
}
