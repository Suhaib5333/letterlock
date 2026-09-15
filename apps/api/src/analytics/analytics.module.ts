import { Body, Controller, Get, HttpCode, Module, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 7b. Our own analytics: no third-party SDK, so no extra consent
 * disclosure and no extra privacy label for data we already store.
 */
export class EventDto {
  @ApiProperty({ description: 'e.g. ad_served, reward_completed, purchase_restored' })
  @IsString()
  @MaxLength(40)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

export class IngestDto {
  @ApiProperty({ description: 'Random per-install id, not a user id' })
  @IsString()
  @MaxLength(40)
  anonId!: string;

  @ApiProperty({ type: [EventDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events!: EventDto[];
}

@ApiTags('Analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget from the client. Public: guests generate most of the traffic. */
  @Post('events')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Batch-ingest client events (max 50)' })
  async ingest(@Body() dto: IngestDto, @CurrentUser() user?: AuthUser) {
    if (dto.events.length === 0) return;
    await this.prisma.event.createMany({
      data: dto.events.map((e) => ({
        name: e.name.slice(0, 40),
        anonId: dto.anonId.slice(0, 40),
        userId: user?.id ?? null,
        // ponytail: props stored verbatim as jsonb. Shape it into columns only when a report needs it.
        props: (e.props ?? {}) as object,
      })),
    });
  }

  /**
   * The /admin report: counts per event name, daily actives, and D1/D7/D30
   * retention off each install's first-seen day.
   */
  @Get('admin/analytics')
  @Roles('admin')
  @ApiOperation({ summary: 'Event counts, daily actives and D1/D7/D30 retention' })
  async report(@Query('days') daysRaw?: string) {
    const days = Math.min(Math.max(Number(daysRaw) || 30, 1), 365);
    const since = new Date(Date.now() - days * 86_400_000);

    const byName = await this.prisma.event.groupBy({
      by: ['name'],
      where: { at: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { name: 'desc' } },
    });

    const daily = await this.prisma.$queryRaw<{ day: Date; actives: bigint; events: bigint }[]>`
      SELECT date_trunc('day', at) AS day,
             count(DISTINCT anon_id) AS actives,
             count(*) AS events
        FROM events WHERE at >= ${since}
       GROUP BY 1 ORDER BY 1`;

    // First-seen per install, then "did that install come back on day N?".
    const retention = await this.prisma.$queryRaw<{ d1: number; d7: number; d30: number; cohort: bigint }[]>`
      WITH first_seen AS (
        SELECT anon_id, min(at) AS t0 FROM events GROUP BY anon_id
      ), c AS (
        SELECT * FROM first_seen WHERE t0 >= ${since}
      )
      SELECT count(*) AS cohort,
             coalesce(avg((EXISTS (SELECT 1 FROM events e WHERE e.anon_id = c.anon_id
               AND e.at >= c.t0 + interval '1 day' AND e.at < c.t0 + interval '2 day'))::int), 0) AS d1,
             coalesce(avg((EXISTS (SELECT 1 FROM events e WHERE e.anon_id = c.anon_id
               AND e.at >= c.t0 + interval '7 day' AND e.at < c.t0 + interval '8 day'))::int), 0) AS d7,
             coalesce(avg((EXISTS (SELECT 1 FROM events e WHERE e.anon_id = c.anon_id
               AND e.at >= c.t0 + interval '30 day' AND e.at < c.t0 + interval '31 day'))::int), 0) AS d30
        FROM c`;

    const r = retention[0];
    return {
      days,
      byName: byName.map((b: { name: string; _count: { _all: number } }) => ({ name: b.name, count: b._count._all })),
      daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), actives: Number(d.actives), events: Number(d.events) })),
      retention: { cohort: Number(r?.cohort ?? 0), d1: Number(r?.d1 ?? 0), d7: Number(r?.d7 ?? 0), d30: Number(r?.d30 ?? 0) },
    };
  }
}

@Module({ controllers: [AnalyticsController] })
export class AnalyticsModule {}
