import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Deploy gate: CI polls this until `db:true`. */
  @Get('healthz')
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  async healthz(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ ok: true, db: true });
    } catch {
      res.status(503).json({ ok: false, db: false });
    }
  }
}
