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
  // Email magic-link — works out of the box on Supabase (default email
  // provider, no SMTP config needed) so users can sign in even when Google
  // OAuth isn't enabled in the dashboard yet.
  signInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
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
    const emailRedirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      // Default `shouldCreateUser: true` — first sign-in creates the user.
      options: { emailRedirectTo },
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
      signOut: async () => {},
      refreshProfile: async () => {},
    };
  }
  return v;
}
