import type { UserRole } from '../generated/prisma/client';

/** JWT payload shapes minted by AuthService. */
export type AccessTokenPayload = { sub: string; typ: 'user' };
export type GuestTokenPayload = { sub: string; typ: 'guest'; name?: string };
export type TokenPayload = AccessTokenPayload | GuestTokenPayload;

/** What JwtAuthGuard attaches to `req.user` for a signed-in account. */
export interface AuthUser {
  id: string;
  email: string | null;
  /** 'player' when the profile has not been claimed yet. */
  role: UserRole;
  banned: boolean;
  hasProfile: boolean;
  username: string | null;
}
