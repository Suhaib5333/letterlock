import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { configureProgress } from '../state/progress';
import { configureSavedGame } from '../state/savedGame';
import { apiBase } from './appConfig';
import {
  api,
  ApiError,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isApiConfigured,
  onAuthLost,
  setTokens,
  type AuthResult,
  type AuthUser,
  type Profile,
} from './api';

export type { AuthUser, Profile } from './api';

type Result = { ok: boolean; error?: string };

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  // Convenience role flags derived from `profile.role`, guarded against banned
  // accounts so a banned admin loses their button immediately on next reload.
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
  // True while a profile re-fetch is in flight (refreshProfile).
  profileLoading: boolean;
  // True once the current user's profile is known (so a null profile genuinely
  // means "no username yet", not "still loading"). Keyed to the user id, never a
  // stale carry-over between identities (Round-23, CLAUDE.md II.3u).
  profileChecked: boolean;
  signInWithGoogle: () => Promise<Result>;
  signInWithApple: () => Promise<Result>;
  signInWithEmail: (email: string) => Promise<Result>;
  verifyEmailOtp: (email: string, code: string) => Promise<Result>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
  refreshProfile: () => Promise<void>;
  // Error carried back from the Google redirect (see consumeAuthCallback). The
  // auth modal shows it once, then clears it.
  authRedirectError: string | null;
  clearAuthRedirectError: () => void;
}

/** Web "Sign in with Apple" is offered only when the Services ID is configured. */
export function appleWebEnabled(): boolean {
  return !!(import.meta.env.VITE_APPLE_SERVICES_ID as string | undefined)?.trim();
}

const REDIRECT_ERRORS: Record<string, string> = {
  google_failed: 'Google could not complete the sign-in',
  invalid_state: 'the sign-in link expired',
  missing_code: 'Google returned no code',
  access_denied: 'the request was cancelled',
  google_unconfigured: 'Google sign-in is not configured on the server',
};

/**
 * The Google flow ends with the API redirecting to `/auth/callback?code=<one-time>
 * &returnTo=<path>` (or `?error=`). Consume that synchronously at module load,
 * BEFORE main.tsx reads `?view=controller`, and restore the URL the player started
 * from (e.g. `/?room=ABC123&view=controller` for a QR sign-in) so every downstream
 * reader sees the original route. The code is exchanged by the provider below.
 */
function consumeAuthCallback(): { code: string | null; error: string | null } {
  if (typeof window === 'undefined') return { code: null, error: null };
  const url = new URL(window.location.href);
  if (!url.pathname.replace(/\/+$/, '').endsWith('/auth/callback')) return { code: null, error: null };
  const code = url.searchParams.get('code');
  const rawError = url.searchParams.get('error');
  const returnTo = url.searchParams.get('returnTo') ?? '';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const target = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : `${base}/`;
  window.history.replaceState(null, '', target);
  const error = rawError ? `${REDIRECT_ERRORS[rawError] ?? rawError} (${rawError})` : null;
  if (error) console.error('OAuth sign-in failed:', error);
  return { code, error };
}
const pendingCallback = consumeAuthCallback();

// Sign in with Apple JS (web). Loaded on demand, only when configured.
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (cfg: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
        signIn: () => Promise<{ authorization: { id_token: string; code: string }; user?: { name?: { firstName?: string; lastName?: string } } }>;
      };
    };
  }
}
let appleScript: Promise<void> | null = null;
function loadAppleJs(): Promise<void> {
  if (window.AppleID) return Promise.resolve();
  appleScript ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    s.onload = () => resolve();
    s.onerror = () => {
      appleScript = null;
      reject(new Error('Could not load Sign in with Apple.'));
    };
    document.head.appendChild(s);
  });
  return appleScript;
}

const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

const AuthCtx = createContext<AuthState | null>(null);
import { setAdsRemovedFromProfile } from './entitlements';


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  // The user id whose profile is KNOWN. profileChecked derives from it
  // (checkedUserId === user.id), so a user switch can never leave a stale
  // "checked" from the previous identity (the Round-23 gate-swallowing race).
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [authRedirectError, setAuthRedirectError] = useState<string | null>(pendingCallback.error);

  // Every sign-in / me response carries user + profile together, so both land in
  // the same render: never a user-without-checked-profile flash.
  const apply = (res: { user: AuthUser; profile: Profile | null }) => {
    setUser(res.user);
    setProfile(res.profile);
    setCheckedUserId(res.user.id);
    // LAUNCH_PLAN §8: Remove Ads follows the LOGIN, not just the store account,
    // so a purchase made on one platform hides ads everywhere the user signs in.
    // apply()/reset() are the only two places a profile appears or disappears
    // (sign-in, /auth/me rehydrate, refreshProfile, sign-out), so wiring both
    // here is the whole story — and reset() clearing it stops a buyer's
    // entitlement leaking to the next person on a shared browser.
    setAdsRemovedFromProfile(res.profile);
  };
  const reset = () => {
    setUser(null);
    setProfile(null);
    setCheckedUserId(null);
    setAdsRemovedFromProfile(null);
  };

  // Bootstrap: exchange a Google one-time code, else rehydrate from the stored
  // tokens (GET /auth/me refreshes an expired access token transparently).
  useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (pendingCallback.code) {
          const code = pendingCallback.code;
          pendingCallback.code = null; // one-time: never re-exchange on a StrictMode re-run
          const res = await api<AuthResult>('/auth/exchange', { method: 'POST', body: { code }, auth: 'none' });
          setTokens(res.accessToken, res.refreshToken);
          if (!cancelled) apply(res);
        } else if (getAccessToken() || getRefreshToken()) {
          const res = await api<{ user: AuthUser; profile: Profile | null }>('/auth/me', { auth: 'user' });
          if (!cancelled) apply(res);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          clearTokens();
          reset();
          if (pendingCallback.error === null && e.code.startsWith('login_code')) {
            setAuthRedirectError(`${e.message} (${e.code})`);
          }
        }
        // Offline / server down: keep the stored tokens, stay signed-out in the UI
        // for this load; the next load retries.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const off = onAuthLost(reset);
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // Point the question-progress tracker + the Resume store at the current
  // identity: signed-in users load their account data; guests get local state.
  useEffect(() => {
    if (loading) return;
    void configureProgress(user?.id ?? null);
    void configureSavedGame(user?.id ?? null);
  }, [user?.id, loading]);

  const signInWithGoogle = async (): Promise<Result> => {
    const base = apiBase();
    if (!base) return { ok: false, error: 'Online features are not configured in this build.' };
    // Preserve the current route (e.g. ?room=ABC123&view=controller) so a player
    // who signs in from the QR-scanned controller lands BACK on the controller
    // after the round-trip, not on the home page (returnTo is echoed by the API).
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`${base}/auth/google?returnTo=${encodeURIComponent(returnTo)}`);
    return { ok: true };
  };

  const signInWithApple = async (): Promise<Result> => {
    const clientId = (import.meta.env.VITE_APPLE_SERVICES_ID as string | undefined)?.trim();
    if (!clientId || !isApiConfigured()) return { ok: false, error: 'Apple sign-in is not available in this build.' };
    try {
      await loadAppleJs();
      window.AppleID!.auth.init({
        clientId,
        scope: 'name email',
        // Must be registered as a Return URL on the Services ID; popup mode still requires it.
        redirectURI: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/auth/callback`,
        usePopup: true,
      });
      const r = await window.AppleID!.auth.signIn();
      const n = r.user?.name;
      const fullName = n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : undefined;
      const res = await api<AuthResult>('/auth/apple', {
        method: 'POST',
        auth: 'none',
        body: { identityToken: r.authorization.id_token, authorizationCode: r.authorization.code, ...(fullName ? { fullName } : {}) },
      });
      setTokens(res.accessToken, res.refreshToken);
      apply(res);
      return { ok: true };
    } catch (e) {
      // The Apple popup rejects with { error: 'popup_closed_by_user' } on cancel.
      const code = (e as { error?: string } | null)?.error;
      if (code === 'popup_closed_by_user') return { ok: false, error: 'Apple sign-in was cancelled.' };
      return { ok: false, error: errorMessage(e, 'Apple sign-in failed.') };
    }
  };

  const signInWithEmail = async (email: string): Promise<Result> => {
    if (!isApiConfigured()) return { ok: false, error: 'Online features are not configured in this build.' };
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { ok: false, error: 'Enter a valid email address.' };
    try {
      await api('/auth/otp/request', { method: 'POST', body: { email: trimmed }, auth: 'none' });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'Could not send the sign-in code.') };
    }
  };

  const verifyEmailOtp = async (email: string, code: string): Promise<Result> => {
    if (!isApiConfigured()) return { ok: false, error: 'Online features are not configured in this build.' };
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) return { ok: false, error: 'Enter the 6 digits from your email.' };
    try {
      const res = await api<AuthResult>('/auth/otp/verify', {
        method: 'POST',
        body: { email: email.trim(), code: trimmedCode },
        auth: 'none',
      });
      setTokens(res.accessToken, res.refreshToken);
      apply(res);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'That code is wrong or expired.') };
    }
  };

  const signOut = async () => {
    const refreshToken = getRefreshToken();
    clearTokens();
    reset();
    if (refreshToken && isApiConfigured()) {
      await api('/auth/logout', { method: 'POST', body: { refreshToken }, auth: 'none' }).catch(() => {});
    }
  };

  /** Store-required in-app account deletion (Apple 5.1.1(v), Play policy). */
  const deleteAccount = async (): Promise<Result> => {
    if (!user || !isApiConfigured()) return { ok: false, error: 'Not signed in.' };
    try {
      await api('/auth/me', { method: 'DELETE', auth: 'user' });
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'Could not delete the account. Try again.') };
    }
    clearTokens();
    reset();
    return { ok: true };
  };

  const refreshProfile = async () => {
    if (!user || !isApiConfigured()) return;
    setProfileLoading(true);
    try {
      apply(await api<{ user: AuthUser; profile: Profile | null }>('/auth/me', { auth: 'user' }));
    } catch {
      /* a lost session is handled by onAuthLost; a network blip keeps the old profile */
    } finally {
      setProfileLoading(false);
    }
  };

  // Signed out counts as "checked" (nothing to fetch); signed in only once THIS
  // user's data arrived.
  const profileChecked = user ? checkedUserId === user.id : true;

  const isBanned = !!profile?.banned_at;
  const isAdmin = !isBanned && profile?.role === 'admin';
  const isModerator = !isBanned && (profile?.role === 'moderator' || profile?.role === 'admin');

  return (
    <AuthCtx.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isModerator,
        isBanned,
        profileLoading,
        profileChecked,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        verifyEmailOtp,
        signOut,
        deleteAccount,
        refreshProfile,
        authRedirectError,
        clearAuthRedirectError: () => setAuthRedirectError(null),
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) {
    // Components may render without AuthProvider (tests, the /img secret-prompt
    // page). They just see "not signed in" forever, which is the right fallback.
    const off: Result = { ok: false, error: 'Auth not initialised.' };
    return {
      user: null,
      profile: null,
      loading: false,
      isAdmin: false,
      isModerator: false,
      isBanned: false,
      profileChecked: false,
      profileLoading: false,
      signInWithGoogle: async () => off,
      signInWithApple: async () => off,
      signInWithEmail: async () => off,
      verifyEmailOtp: async () => off,
      signOut: async () => {},
      deleteAccount: async () => off,
      refreshProfile: async () => {},
      authRedirectError: null,
      clearAuthRedirectError: () => {},
    };
  }
  return v;
}
