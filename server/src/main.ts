import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppLogger } from './common/app-logger';
import { httpLogger } from './common/http-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(),
  });
  const logger = new Logger('Bootstrap');

  // Behind a proxy (Render, Vercel, etc.) req.ip would otherwise be the proxy's address.
  app.set('trust proxy', 1);

  // Request logs for development and deployments. Registered first so every request is
  // covered, including CORS preflights and 404s. Set LOG_REQUESTS=false to turn off.
  if (process.env.LOG_REQUESTS !== 'false') {
    app.use(
      httpLogger({ logHealthChecks: process.env.LOG_HEALTH_CHECKS === 'true' }),
    );
  }

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

  logger.log(`Allowed CORS origins: ${Array.from(allowedOrigins).join(', ')}`);
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
      logger.warn(`CORS blocked for origin: ${origin}`);
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
  logger.log(`Server running on http://localhost:${port}`);
}
bootstrap();
