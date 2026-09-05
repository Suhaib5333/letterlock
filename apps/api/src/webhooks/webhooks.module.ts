import { Body, Controller, Headers, HttpCode, Injectable, Logger, Module, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRANT = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE']);
const REVOKE = new Set(['CANCELLATION', 'EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED']);
const ENTITLEMENT = 'no_ads';

export interface RevenueCatEvent {
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  product_id?: string;
  store?: string;
  transferred_from?: string[];
  transferred_to?: string[];
  event_timestamp_ms?: number;
}

function sourceOf(store?: string): string {
  const s = (store ?? '').toUpperCase();
  if (s.includes('APP_STORE') || s.includes('MAC')) return 'apple';
  if (s.includes('PLAY')) return 'google';
  if (s.includes('STRIPE') || s.includes('WEB') || s.includes('PADDLE')) return 'web';
  return s ? s.toLowerCase() : 'unknown';
}

/** Only this handler ever writes profiles.ads_removed (LAUNCH_PLAN §8). */
@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(private readonly prisma: PrismaService) {}

  verify(authorization: string | undefined): void {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET ?? '';
    const given = (authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!secret || !given || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
      throw new UnauthorizedException({ message: 'Bad webhook secret', code: 'webhook_unauthorized' });
    }
  }

  async handle(event: RevenueCatEvent | undefined): Promise<{ ok: true; applied: string[] }> {
    if (!event?.type) return { ok: true, applied: [] };
    const entitlements = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
    const touchesNoAds = entitlements.includes(ENTITLEMENT) || event.type === 'TRANSFER';
    if (!touchesNoAds) return { ok: true, applied: [] };

    const source = sourceOf(event.store);
    const applied: string[] = [];
    const candidates = (ids: (string | undefined)[]) => ids.filter((x): x is string => !!x && UUID_RE.test(x));

    if (event.type === 'TRANSFER') {
      for (const id of candidates(event.transferred_from ?? [])) if (await this.set(id, false, source, event)) applied.push(`-${id}`);
      for (const id of candidates(event.transferred_to ?? [])) if (await this.set(id, true, source, event)) applied.push(`+${id}`);
      return { ok: true, applied };
    }

    const targets = candidates([event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]);
    const first = targets[0];
    if (!first) {
      this.logger.warn(`RevenueCat ${event.type}: no profile-shaped app_user_id (${event.app_user_id})`);
      return { ok: true, applied };
    }
    if (GRANT.has(event.type)) {
      if (await this.set(first, true, source, event)) applied.push(`+${first}`);
    } else if (REVOKE.has(event.type)) {
      if (await this.set(first, false, source, event)) applied.push(`-${first}`);
    }
    return { ok: true, applied };
  }

  private async set(profileId: string, on: boolean, source: string, ev: RevenueCatEvent): Promise<boolean> {
    const { count } = await this.prisma.profile.updateMany({
      where: { id: profileId },
      data: {
        adsRemoved: on,
        adsRemovedSource: on ? source : `${source}:${ev.type.toLowerCase()}`,
        adsRemovedAt: new Date(ev.event_timestamp_ms ?? Date.now()),
        rcAppUserId: ev.app_user_id ?? null,
      },
    });
    if (count === 0) this.logger.warn(`RevenueCat ${ev.type}: no profile ${profileId}`);
    return count > 0;
  }
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly rc: RevenueCatService) {}

  @Post('revenuecat')
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: 'RevenueCat webhook (Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>)' })
  revenuecat(@Headers('authorization') authorization: string | undefined, @Body() body: { event?: RevenueCatEvent }) {
    this.rc.verify(authorization);
    return this.rc.handle(body?.event);
  }
}

@Module({ controllers: [WebhooksController], providers: [RevenueCatService] })
export class WebhooksModule {}
