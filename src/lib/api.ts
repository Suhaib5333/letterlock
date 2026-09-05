/**
 * Tiny fetch wrapper for our own API (LAUNCH_PLAN Phase 2.7). No axios.
 *
 *  - Base URL from `apiBase()` (VITE_API_URL, or the local `?__apiurl=` seam).
 *  - Bearer token from localStorage: the user access token (`ll_access`), else
 *    the room guest token (`ll_guest`). `src/lib/native.ts` mirrors every `ll_*`
 *    key into Capacitor Preferences, so the apps keep their session too.
 *  - 401 with a refresh token -> ONE single-flight POST /auth/refresh, then the
 *    request is retried once. A failed refresh wipes the session and tells the
 *    AuthProvider (onAuthLost) so the UI drops to signed-out.
 *  - Errors are RFC 7807 problem JSON -> `ApiError { status, code, message }`.
 *    Transport failures throw `ApiError` with status 0 / code 'network' (the
 *    offline queue keys on that).
 */
import { apiBase } from './appConfig';

export const ACCESS_KEY = 'll_access';
export const REFRESH_KEY = 'll_refresh';
export const GUEST_KEY = 'll_guest';

export type UserRole = 'player' | 'moderator' | 'admin';

/** Wire shape of a profile (apps/api/src/common/profile.dto.ts). */
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  banned_at: string | null;
  created_at: string;
  updated_at?: string;
  username_changed_at: string | null;
  xp: number;
  level: number;
  prestige: number;
  total_xp: number;
  full_access: boolean;
  ads_removed?: boolean;
  ads_removed_source?: string | null;
  ads_removed_at?: string | null;
}

export interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
}

/** POST /auth/otp/verify, /auth/refresh, /auth/exchange, /auth/apple, ... */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  profile: Profile | null;
}

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  banned_at: string | null;
  created_at: string;
  level: number;
  prestige: number;
  total_xp: number;
  full_access: boolean;
  ads_removed?: boolean;
}

export interface CustomPack {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  emoji: string;
  difficulty: 'kids' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';
  body: { letters: Record<string, { q: string; a: string; id?: string }[]> };
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  body: Record<string, unknown> | null;
  constructor(status: number, code: string, message: string, body: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export function isApiConfigured(): boolean {
  return apiBase() !== null;
}

/** True for a transport failure (offline, DNS, server unreachable): retry later. */
export function isNetworkApiError(e: unknown): boolean {
  return e instanceof ApiError && e.code === 'network';
}

// ------------------------------------------------------------------ tokens

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the session just does not persist */
  }
}

export const getAccessToken = (): string | null => read(ACCESS_KEY);
export const getRefreshToken = (): string | null => read(REFRESH_KEY);
export const getGuestToken = (): string | null => read(GUEST_KEY);

export function setTokens(access: string, refresh: string): void {
  write(ACCESS_KEY, access);
  write(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  write(ACCESS_KEY, null);
  write(REFRESH_KEY, null);
}

/** JWT `exp` as epoch ms, or null when the token is not a decodable JWT. */
export function tokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

const lostListeners = new Set<() => void>();
/** Fires when a refresh is refused (session revoked / expired): sign the UI out. */
export function onAuthLost(cb: () => void): () => void {
  lostListeners.add(cb);
  return () => lostListeners.delete(cb);
}
function authLost(): void {
  clearTokens();
  for (const cb of lostListeners) cb();
}

// ----------------------------------------------------------------- refresh

let refreshing: Promise<string | null> | null = null;

/** Single-flight refresh. Resolves the new access token, or null when refused. */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);
  refreshing = (async () => {
    try {
      const res = await api<AuthResult>('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: 'none' });
      setTokens(res.accessToken, res.refreshToken);
      return res.accessToken;
    } catch (e) {
      // 401 = revoked/replayed/expired: the session is gone. A network failure
      // keeps the tokens so the next attempt can succeed.
      if (e instanceof ApiError && e.status === 401) authLost();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** The access token, refreshed first when it expires within 30 s (socket handshakes). */
export async function ensureFreshToken(): Promise<string | null> {
  const access = getAccessToken();
  if (!access) return null;
  const exp = tokenExpiry(access);
  if (exp !== null && exp - Date.now() < 30_000 && getRefreshToken()) {
    return (await refreshAccessToken()) ?? getAccessToken();
  }
  return access;
}

/** A 24-hour guest token for phones without an account (POST /auth/guest). Cached. */
export async function ensureGuestToken(name?: string): Promise<string> {
  const cur = getGuestToken();
  const exp = tokenExpiry(cur);
  if (cur && exp !== null && exp - Date.now() > 60_000) return cur;
  const res = await api<{ guestToken: string }>('/auth/guest', { method: 'POST', body: name ? { name } : {}, auth: 'none' });
  write(GUEST_KEY, res.guestToken);
  return res.guestToken;
}

// ------------------------------------------------------------------- fetch

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 'any' (default): user token, else guest token. 'user': user token only. 'none': anonymous. */
  auth?: 'any' | 'user' | 'none';
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function bearerFor(auth: ApiOptions['auth']): string | null {
  if (auth === 'none') return null;
  return getAccessToken() ?? (auth === 'user' ? null : getGuestToken());
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* not JSON */
  }
  const detail = typeof body?.detail === 'string' ? body.detail : '';
  const errors = Array.isArray(body?.errors) ? (body.errors as string[]).join(', ') : '';
  const title = typeof body?.title === 'string' ? body.title : res.statusText;
  const code = typeof body?.code === 'string' ? body.code : `http_${res.status}`;
  return new ApiError(res.status, code, detail || errors || title || `HTTP ${res.status}`, body);
}

/** JSON request against the API. Resolves the parsed body (`undefined` for 204). */
export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const base = apiBase();
  if (!base) throw new ApiError(0, 'unconfigured', 'API not configured (VITE_API_URL is not set).');
  const auth = opts.auth ?? 'any';
  const run = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetch(`${base}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: opts.signal,
      });
    } catch (e) {
      throw new ApiError(0, 'network', e instanceof Error ? e.message : 'Failed to fetch');
    }
  };

  let token = bearerFor(auth);
  let res = await run(token);
  // Expired access token: refresh once, retry once. Never for the auth routes
  // themselves (a failing refresh must not recurse).
  const usedUserToken = !!token && token === getAccessToken();
  if (res.status === 401 && usedUserToken && !path.startsWith('/auth/refresh') && !path.startsWith('/auth/logout')) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      token = fresh;
      res = await run(token);
    }
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
