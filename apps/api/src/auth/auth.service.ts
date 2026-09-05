import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { toProfileDto, type ProfileDto } from '../common/profile.dto';
import type { AccessTokenPayload, GuestTokenPayload } from '../common/auth-user';

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

export const ACCESS_TTL = '15m';
export const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_LOCK_MS = 60 * 1000;
export const OTP_MAX_PER_WINDOW = 3;
export const OTP_WINDOW_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_TTL_MS = 5 * 60 * 1000;
export const GUEST_TTL_S = 24 * 60 * 60;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string | null; created_at: string };
  profile: ProfileDto | null;
}

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // ---------------------------------------------------------------- Email OTP

  async requestOtp(email: string): Promise<{ ok: true }> {
    const since = new Date(Date.now() - OTP_WINDOW_MS);
    const recent = await this.prisma.otpCode.findMany({
      where: { email, createdAt: { gt: since } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent.length >= OTP_MAX_PER_WINDOW) {
      const retry = Math.ceil((recent[recent.length - 1].createdAt.getTime() + OTP_WINDOW_MS - Date.now()) / 1000);
      throw new HttpException(
        { message: `Too many code requests. Try again in about ${Math.max(1, Math.ceil(retry / 60))} minute(s).`, code: 'otp_rate_limited', retryAfter: retry },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < OTP_RESEND_LOCK_MS) {
      throw new HttpException(
        { message: 'Please wait 60 seconds before requesting another code.', code: 'otp_resend_lock' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const salt = randomUUID();
    const derived = await scryptAsync(code, salt, 64);
    await this.prisma.otpCode.create({
      data: { email, codeHash: `${salt}:${derived.toString('hex')}`, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    await this.mail.sendOtp(email, code);
    return { ok: true };
  }

  /**
   * Dev/e2e hook: the last OTP captured for `email` (MailService dev mode). Hard
   * 404 in production or whenever a real mailer (RESEND_API_KEY) is configured, so
   * it can never leak a code that was actually emailed.
   */
  devOtpCode(email: string): { code: string | null } {
    if (process.env.NODE_ENV === 'production' || !this.mail.devMode) {
      throw new NotFoundException({ message: 'Not available', code: 'not_found' });
    }
    return { code: this.mail.lastDevCode(email.trim().toLowerCase()) ?? null };
  }

  async verifyOtp(email: string, code: string, userAgent?: string): Promise<AuthResult> {
    const otp = await this.prisma.otpCode.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } });
    if (!otp) throw new UnauthorizedException({ message: 'No code found. Request a new one.', code: 'otp_missing' });
    if (otp.expiresAt < new Date()) {
      await this.prisma.otpCode.deleteMany({ where: { email } });
      throw new UnauthorizedException({ message: 'Code expired. Request a new one.', code: 'otp_expired' });
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpCode.deleteMany({ where: { email } });
      throw new UnauthorizedException({ message: 'Too many attempts. Request a new code.', code: 'otp_attempts' });
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });

    const [salt, hex] = otp.codeHash.split(':');
    const derived = await scryptAsync(code, salt, 64);
    const expected = Buffer.from(hex, 'hex');
    if (derived.length !== expected.length || !timingSafeEqual(derived, expected)) {
      throw new UnauthorizedException({ message: 'Invalid code.', code: 'otp_invalid' });
    }
    await this.prisma.otpCode.deleteMany({ where: { email } });

    const user = await this.prisma.user.upsert({ where: { email }, update: {}, create: { email } });
    return this.issueTokens(user.id, userAgent);
  }

  // ------------------------------------------------------------ Refresh flow

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthResult> {
    const tokenHash = this.sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) {
      // Replay of a rotated token or a forged one: nothing to revoke beyond this.
      throw new UnauthorizedException({ message: 'Invalid refresh token.', code: 'refresh_invalid' });
    }
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException({ message: 'Session expired. Please sign in again.', code: 'refresh_expired' });
    }
    // Rotation: deleteMany avoids P2025 on a concurrent refresh; count===0 means
    // another request already consumed this token (replay) so we reject it.
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    if (count === 0) {
      throw new UnauthorizedException({ message: 'Refresh token already used.', code: 'refresh_replayed' });
    }
    return this.issueTokens(stored.userId, userAgent);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.sha256(refreshToken) } });
    return { ok: true };
  }

  async me(userId: string): Promise<{ user: AuthResult['user']; profile: ProfileDto | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new UnauthorizedException({ message: 'Account no longer exists', code: 'user_gone' });
    return {
      user: { id: user.id, email: user.email, created_at: user.createdAt.toISOString() },
      profile: user.profile ? toProfileDto(user.profile) : null,
    };
  }

  /** Store-required account deletion. FK cascades remove profile, leaderboard,
   *  friendships (both sides), saved game, progress, custom packs, room members,
   *  refresh tokens and login codes. */
  async deleteAccount(userId: string): Promise<{ ok: true }> {
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  // ------------------------------------------------------------- Google web

  googleRedirectUrl(returnTo?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException({ message: 'Google sign-in is not configured', code: 'google_unconfigured' });
    const state = this.jwt.sign({ typ: 'oauth_state', rt: this.safeReturnTo(returnTo) }, { expiresIn: '10m' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.googleCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /** Exchanges the Google code, upserts the user, returns the SPA redirect URL. */
  async googleCallback(code: string | undefined, state: string | undefined, error?: string): Promise<string> {
    const web = process.env.WEB_URL || 'http://localhost:5173';
    let returnTo = '';
    try {
      const s = this.jwt.verify<{ typ: string; rt?: string }>(state ?? '');
      if (s.typ !== 'oauth_state') throw new Error('bad state');
      returnTo = s.rt ?? '';
    } catch {
      return `${web}/auth/callback?error=${encodeURIComponent('invalid_state')}`;
    }
    if (error || !code) {
      return `${web}/auth/callback?error=${encodeURIComponent(error || 'missing_code')}`;
    }
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID ?? '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          redirect_uri: this.googleCallbackUrl(),
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenRes.ok) throw new Error(`token exchange ${tokenRes.status}`);
      const tokens = (await tokenRes.json()) as { id_token?: string };
      if (!tokens.id_token) throw new Error('no id_token');
      const user = await this.upsertGoogleUser(tokens.id_token);
      const oneTime = await this.mintLoginCode(user.id);
      const qs = new URLSearchParams({ code: oneTime });
      if (returnTo) qs.set('returnTo', returnTo);
      return `${web}/auth/callback?${qs}`;
    } catch (e) {
      this.logger.warn(`Google callback failed: ${e instanceof Error ? e.message : e}`);
      return `${web}/auth/callback?error=${encodeURIComponent('google_failed')}`;
    }
  }

  async exchangeLoginCode(code: string, userAgent?: string): Promise<AuthResult> {
    const row = await this.prisma.loginCode.findUnique({ where: { codeHash: this.sha256(code) } });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException({ message: 'Invalid or expired login code', code: 'login_code_invalid' });
    }
    const { count } = await this.prisma.loginCode.deleteMany({ where: { id: row.id } });
    if (count === 0) throw new UnauthorizedException({ message: 'Login code already used', code: 'login_code_used' });
    return this.issueTokens(row.userId, userAgent);
  }

  async googleNative(idToken: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.upsertGoogleUser(idToken);
    return this.issueTokens(user.id, userAgent);
  }

  private async upsertGoogleUser(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new BadRequestException({ message: 'Google sign-in is not configured', code: 'google_unconfigured' });
    // Native apps may carry their own OAuth client ids (comma list); the web id is first.
    const audiences = [clientId, ...(process.env.GOOGLE_NATIVE_CLIENT_IDS ?? '').split(',')].map((s) => s.trim()).filter(Boolean);
    this.googleClient ??= new OAuth2Client();
    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken, audience: audiences });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException({ message: 'Invalid Google token', code: 'google_token_invalid' });
    }
    if (!payload?.sub) throw new UnauthorizedException({ message: 'Invalid Google token', code: 'google_token_invalid' });
    const email = payload.email_verified && payload.email ? payload.email.toLowerCase() : null;
    return this.upsertProviderUser('google', payload.sub, email);
  }

  // ------------------------------------------------------------------ Apple

  async apple(identityToken: string, userAgent?: string): Promise<AuthResult> {
    const audiences = (process.env.APPLE_CLIENT_ID ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!audiences.length) throw new BadRequestException({ message: 'Apple sign-in is not configured', code: 'apple_unconfigured' });
    let claims: { sub?: string; email?: string; email_verified?: string | boolean };
    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: audiences,
      });
      claims = payload as typeof claims;
    } catch {
      throw new UnauthorizedException({ message: 'Invalid Apple token', code: 'apple_token_invalid' });
    }
    if (!claims.sub) throw new UnauthorizedException({ message: 'Invalid Apple token', code: 'apple_token_invalid' });
    const email = claims.email ? claims.email.toLowerCase() : null;
    const user = await this.upsertProviderUser('apple', claims.sub, email);
    return this.issueTokens(user.id, userAgent);
  }

  /** Match by provider sub first, then by verified email (links Google/Apple to an OTP account). */
  private async upsertProviderUser(provider: 'google' | 'apple', sub: string, email: string | null) {
    const subField = provider === 'google' ? 'googleSub' : 'appleSub';
    const bySub = await this.prisma.user.findUnique({ where: { [subField]: sub } as never });
    if (bySub) {
      if (!bySub.email && email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (!clash) return this.prisma.user.update({ where: { id: bySub.id }, data: { email } });
      }
      return bySub;
    }
    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) return this.prisma.user.update({ where: { id: byEmail.id }, data: { [subField]: sub } });
    }
    return this.prisma.user.create({ data: { email, [subField]: sub } });
  }

  // ------------------------------------------------------------------ Guest

  async guest(name?: string): Promise<{ guestToken: string; guestId: string; expiresAt: string }> {
    const expiresAt = new Date(Date.now() + GUEST_TTL_S * 1000);
    const row = await this.prisma.guestToken.create({ data: { name: name ?? null, expiresAt } });
    const payload: GuestTokenPayload = { sub: row.id, typ: 'guest', ...(name ? { name } : {}) };
    const guestToken = this.jwt.sign(payload, { expiresIn: GUEST_TTL_S });
    // Opportunistic cleanup of expired guests so the table cannot grow forever.
    await this.prisma.guestToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return { guestToken, guestId: row.id, expiresAt: expiresAt.toISOString() };
  }

  // ---------------------------------------------------------------- Helpers

  private async issueTokens(userId: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new UnauthorizedException({ message: 'Account no longer exists', code: 'user_gone' });
    const payload: AccessTokenPayload = { sub: user.id, typ: 'user' };
    const accessToken = this.jwt.sign(payload, { expiresIn: ACCESS_TTL });
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userAgent: userAgent?.slice(0, 200) ?? null,
      },
    });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, created_at: user.createdAt.toISOString() },
      profile: user.profile ? toProfileDto(user.profile) : null,
    };
  }

  private async mintLoginCode(userId: string): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.prisma.loginCode.create({
      data: { userId, codeHash: this.sha256(code), expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS) },
    });
    return code;
  }

  private googleCallbackUrl(): string {
    return `${(process.env.PUBLIC_URL || 'http://localhost:3100').replace(/\/$/, '')}/auth/google/callback`;
  }

  /** Only same-origin relative paths survive (open-redirect guard). */
  private safeReturnTo(rt?: string): string {
    if (!rt || !rt.startsWith('/') || rt.startsWith('//')) return '';
    return rt.slice(0, 500);
  }

  private sha256(s: string): string {
    return createHash('sha256').update(s).digest('hex');
  }
}
