import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Browsers send the Origin header without a trailing slash and in lower case, so
  // normalise configured values the same way (e.g. "https://app.vercel.app/" in an
  // env var would otherwise never match).
  const normalizeOrigin = (origin: string) =>
    origin.trim().replace(/\/+$/, '').toLowerCase();

  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const allowedOrigins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://final-year-project-management-six.vercel.app',
    ...configuredOrigins,
  ]);

  console.log('Allowed CORS origins:', Array.from(allowedOrigins))
  // Enable CORS for frontend
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser tools and same-origin requests with no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      // Reject without throwing, so the response is a normal one (just without
      // CORS headers) instead of a 500 from the error handler.
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
