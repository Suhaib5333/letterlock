import type { Access } from '../core/progression';
import { GUEST_ACCESS } from '../core/progression';
import { devSeamsEnabled, hasDevSeam } from './devSeams';
import { supabase, type Profile } from './supabase';

/** Result of an XP award (mirrors the award_xp RPC return row). */
export interface AwardResult {
  xp: number;
  level: number;
  prestige: number;
  total_xp: number;
  leveled_up: boolean;
}

/**
 * Award XP to the signed-in user via the server RPC (clamped + capped server
 * side). No-ops cleanly when signed out / Supabase unconfigured. Returns the new
 * progression row, or null if nothing happened.
 */
export async function awardXp(amount: number): Promise<AwardResult | null> {
  if (!supabase) return null;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) return null;
  const { data, error } = await supabase.rpc('award_xp', { amount });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AwardResult) ?? null;
}

/** Manually prestige (eligible at level 10). Returns the new {level, prestige}. */
export async function prestigeUp(): Promise<{ level: number; prestige: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('prestige_up');
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as { level: number; prestige: number }) ?? null;
}

/** Test/QA seam: `?__unlockall=1` (or localStorage flag) grants full access so the
 *  Playwright checkers can exercise locked content. Gated to local dev/test hosts
 *  (see devSeams.ts) so a real user can't unlock content by editing the URL. */
function unlockAllSeam(): boolean {
  if (!devSeamsEnabled()) return false;
  try {
    if (hasDevSeam('__unlockall')) return true;
    return localStorage.getItem('letterlock.unlockall') === '1';
  } catch {
    return false;
  }
}

/** Derive the unlock Access from a profile (or the guest set when signed out). */
export function accessFromProfile(profile: Profile | null | undefined): Access {
  if (unlockAllSeam()) return { level: 10, prestige: 1, fullAccess: true };
  if (!profile) return GUEST_ACCESS;
  return {
    level: profile.level ?? 1,
    prestige: profile.prestige ?? 0,
    fullAccess: !!profile.full_access,
  };
}
