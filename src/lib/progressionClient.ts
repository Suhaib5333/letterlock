import type { Access } from '../core/progression';
import { GUEST_ACCESS } from '../core/progression';
import { api, getAccessToken, isApiConfigured, isNetworkApiError, type Profile } from './api';
import { devSeamsEnabled, hasDevSeam } from './devSeams';
import { enqueue, registerRunner } from './offlineQueue';
import { isOnline } from './online';

/** Result of an XP award (POST /xp/award). */
export interface AwardResult {
  xp: number;
  level: number;
  prestige: number;
  total_xp: number;
  leveled_up: boolean;
}

const signedIn = () => isApiConfigured() && !!getAccessToken();

/**
 * Award XP to the signed-in user (clamped + capped server side). No-ops cleanly
 * when signed out / the API is unconfigured. Returns the new progression row, or
 * null if nothing happened.
 */
export async function awardXp(amount: number): Promise<AwardResult | null> {
  if (!signedIn()) return null;
  // Offline: park the award in the local queue; it is replayed on reconnect
  // (offlineQueue.ts). The level-up celebration for that award is skipped.
  if (!isOnline()) {
    enqueue('award_xp', { amount });
    return null;
  }
  try {
    return await api<AwardResult>('/xp/award', { method: 'POST', body: { amount }, auth: 'user' });
  } catch (e) {
    if (isNetworkApiError(e)) enqueue('award_xp', { amount });
    return null;
  }
}

registerRunner('award_xp', async (payload) => {
  const amount = (payload as { amount?: number } | null)?.amount;
  if (!signedIn() || typeof amount !== 'number') return;
  await api('/xp/award', { method: 'POST', body: { amount }, auth: 'user' }); // a network error re-queues it
});

/** Manually prestige (eligible at level 10). Returns the new {level, prestige}. */
export async function prestigeUp(): Promise<{ level: number; prestige: number } | null> {
  if (!signedIn()) return null;
  return api<{ level: number; prestige: number }>('/xp/prestige', { method: 'POST', auth: 'user' }).catch(() => null);
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
