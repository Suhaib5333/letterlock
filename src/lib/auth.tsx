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
  signInWithGoogle: () => Promise<void>;
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

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
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
      signInWithGoogle: async () => {},
      signOut: async () => {},
      refreshProfile: async () => {},
    };
  }
  return v;
}
