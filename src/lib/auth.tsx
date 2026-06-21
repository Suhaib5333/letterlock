import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from './supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  // Convenience role flags derived from `profile.role` — guarded against banned
  // accounts so a banned admin loses their button immediately on next reload.
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  // Email OTP — works out of the box on Supabase (default email provider,
  // no SMTP / dashboard config needed) so users can sign in even when Google
  // OAuth isn't enabled in the dashboard yet. The email contains both a
  // magic-link AND a 6-digit code; we expose both flows.
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyEmailOtp: (
    email: string,
    code: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap: rehydrate the session from localStorage (supabase-js does
  // this internally when persistSession=true) then listen for changes.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load the profile row whenever the user changes — drives the username
  // gate (a fresh Google sign-in has no profile until they claim a name).
  useEffect(() => {
    if (!user || !supabase) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile((data as Profile) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signInWithGoogle = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) return { ok: false, error: 'Supabase not configured.' };
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      // The most common failure mode is "Unsupported provider: provider is not
      // enabled" — Supabase returns this until Google OAuth is toggled on in
      // the dashboard. Surface a hint instead of crashing.
      const msg = /provider is not enabled/i.test(error.message)
        ? 'Google sign-in is not enabled in this project yet. Use the email option below — it works out of the box.'
        : error.message;
      return { ok: false, error: msg };
    }
    return { ok: true };
  };

  const signInWithEmail = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) return { ok: false, error: 'Supabase not configured.' };
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { ok: false, error: 'Enter a valid email address.' };
    }

    // Preferred path: our Supabase Edge Function at /functions/v1/send-otp.
    // It calls Supabase Admin (service_role) to mint an OTP, then sends the
    // email via Resend — bypassing Supabase's 2-emails-per-hour default
    // mailer rate limit AND avoiding Cloudflare in the email path entirely.
    // The function source is at `supabase/functions/send-otp/index.ts`.
    //
    // If the function isn't deployed yet (or returns 404), fall back to
    // Supabase's default signInWithOtp so sign-in still works at all.
    const supabaseUrl = (supabase as unknown as { supabaseUrl?: string }).supabaseUrl
      ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined);
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (supabaseUrl && anonKey) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Edge Functions accept the anon key in the apikey header. Even
            // with --no-verify-jwt this is good practice; some Supabase
            // gateways enforce it.
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ email: trimmed }),
        });
        if (res.ok) return { ok: true };
        // 404 → function not deployed yet → fall through to direct supabase.
        if (res.status !== 404) {
          const data = (await res.json().catch(() => ({ error: 'Unknown error' }))) as {
            error?: string;
          };
          return { ok: false, error: data.error ?? `Send failed (HTTP ${res.status}).` };
        }
      } catch {
        // Network failure — fall through.
      }
    }

    // Fallback: direct Supabase mailer (works, but rate-limited 2/hour).
    const emailRedirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo },
    });
    if (error) {
      const friendly =
        /rate limit/i.test(error.message) || /429/.test(error.message)
          ? 'Supabase’s built-in email is rate-limited to 2/hour. Set up Resend in the Cloudflare Pages env (RESEND_API + SUPABASE_SERVICE_ROLE_KEY) to lift this.'
          : error.message;
      return { ok: false, error: friendly };
    }
    return { ok: true };
  };

  const verifyEmailOtp = async (
    email: string,
    code: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!supabase) return { ok: false, error: 'Supabase not configured.' };
    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      return { ok: false, error: 'Enter the 6-digit code from your email.' };
    }
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmedCode,
      type: 'email',
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user || !supabase) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  const isBanned = !!profile?.banned_at;
  const isAdmin = !isBanned && profile?.role === 'admin';
  const isModerator = !isBanned && (profile?.role === 'moderator' || profile?.role === 'admin');

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        isModerator,
        isBanned,
        signInWithGoogle,
        signInWithEmail,
        verifyEmailOtp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) {
    // Allow components to render without crashing when AuthProvider isn't
    // mounted (e.g. tests, /img secret-prompt page). They just see "not
    // signed in" forever, which is the right fallback.
    return {
      user: null,
      session: null,
      profile: null,
      loading: false,
      isAdmin: false,
      isModerator: false,
      isBanned: false,
      signInWithGoogle: async () => ({ ok: false, error: 'Auth not initialised.' }),
      signInWithEmail: async () => ({ ok: false, error: 'Auth not initialised.' }),
      verifyEmailOtp: async () => ({ ok: false, error: 'Auth not initialised.' }),
      signOut: async () => {},
      refreshProfile: async () => {},
    };
  }
  return v;
}
