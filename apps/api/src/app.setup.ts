import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { bundlesDir } from './app.module';
import { ProblemDetailsFilter } from './common/filters/problem.filter';
import { PrismaExceptionFilter, PrismaInitFilter } from './common/filters/prisma-exception.filter';

// BigInt columns (profiles.total_xp) must serialize as JSON numbers.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function toJSON() {
  return Number(this);
};

/** Parse CORS_ORIGINS (comma list). Capacitor/localhost origins pass when listed. */
export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? '';
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Shared between main.ts and the e2e tests so both run the identical pipeline. */
export function configureApp(app: INestApplication): void {
  // Most specific filter last (Nest applies filters in reverse registration order).
  app.useGlobalFilters(new ProblemDetailsFilter(), new PrismaInitFilter(), new PrismaExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // OTA bundles (LAUNCH_PLAN Phase 3c): GET /bundles/<version>.zip. Plain express.static
  // (ServeStaticModule never mounted under the testing module); a miss falls through to
  // Nest's JSON 404.
  (app as NestExpressApplication).use('/bundles', express.static(bundlesDir, { index: false, dotfiles: 'deny' }));
  const origins = corsOrigins();
  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });
}
