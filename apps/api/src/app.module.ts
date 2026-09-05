import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { MeModule } from './me/me.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { XpModule } from './xp/xp.module';
import { FriendsModule } from './friends/friends.module';
import { SavesModule } from './saves/saves.module';
import { ProgressModule } from './progress/progress.module';
import { PacksModule } from './packs/packs.module';
import { RoomsModule } from './rooms/rooms.module';
import { AdminModule } from './admin/admin.module';
import { AppConfigModule } from './config/app-config.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RealtimeModule } from './realtime/realtime.module';

export const bundlesDir = resolve(process.env.BUNDLES_DIR || './bundles');
if (!existsSync(bundlesDir)) {
  try {
    mkdirSync(bundlesDir, { recursive: true });
  } catch {
    /* read-only FS in some CI sandboxes: serve-static then just 404s */
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 120 requests per minute per IP. Auth routes tighten this.
    // THROTTLE_DISABLED=1 only in the e2e suite (many sign-ins from one IP).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.THROTTLE_DISABLED === '1',
    }),
    // One JwtModule for the whole app (access tokens, guest tokens, oauth state).
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET }),
    PrismaModule,
    AuthModule,
    MeModule,
    LeaderboardModule,
    XpModule,
    FriendsModule,
    SavesModule,
    ProgressModule,
    PacksModule,
    RoomsModule,
    AdminModule,
    AppConfigModule,
    WebhooksModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
