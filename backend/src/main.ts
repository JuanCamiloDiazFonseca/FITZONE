import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  const configuredOrigins = config.get<string>('CORS_ORIGIN');
  if (config.get<string>('NODE_ENV') === 'production' && !configuredOrigins?.trim()) {
    throw new Error('CORS_ORIGIN debe configurarse en producción.');
  }
  const allowedOrigins = (configuredOrigins ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
}

void bootstrap();
