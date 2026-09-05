import { useSyncExternalStore } from 'react';

/**
 * Single source of truth for `adsRemoved` (LAUNCH_PLAN Phase 5, §8).
 *
 * Two independent sources, OR-ed together, exactly as §8 rules:
 *   - `store`:   RevenueCat customer info on this device (entitlement `no_ads`),
 *                set by purchases.ts;
 *   - `profile`: the signed-in account's `ads_removed` flag from our API,
 *                set through `setAdsRemovedFromProfile(profile)` or a
 *                `ll:profile` CustomEvent on window (`{ ads_removed }` detail).
 * Both are cached in localStorage `ll_ads_removed` so an offline launch keeps
 * ads hidden for a buyer. The key starts with `ll_`, so native.ts mirrors it
 * into Preferences on the apps.
 */
const KEY = 'll_ads_removed';

type Source = 'store' | 'profile';
type Cache = Partial<Record<Source, boolean>>;

function read(): Cache {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    if (!raw) return {};
    if (raw === '1') return { profile: true }; // legacy plain flag
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

let sources: Cache = read();
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sources));
  } catch {
    /* storage unavailable: in-memory value still works this session */
  }
}

/** True when either the store account or the signed-in account owns Remove Ads. */
export function adsRemoved(): boolean {
  return sources.store === true || sources.profile === true;
}

export function setAdsRemoved(value: boolean, source: Source): void {
  if (sources[source] === value) return;
  const before = adsRemoved();
  sources = { ...sources, [source]: value };
  persist();
  if (adsRemoved() !== before) for (const l of listeners) l();
}

export function subscribeAdsRemoved(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React hook: re-renders when the combined flag flips. */
export function useAdsRemoved(): boolean {
  return useSyncExternalStore(subscribeAdsRemoved, adsRemoved, adsRemoved);
}

/** Profile shape from our API (`/me`, snake_case) or the client's camelCase copy. */
export interface ProfileLike {
  ads_removed?: boolean | null;
  adsRemoved?: boolean | null;
}

/**
 * Hook point for the auth layer: call with the fresh profile after sign-in /
 * refresh, and with `null` on sign-out (the store source is untouched, so a
 * device-level purchase still hides ads for a guest).
 */
export function setAdsRemovedFromProfile(profile: ProfileLike | null | undefined): void {
  setAdsRemoved(profile?.ads_removed === true || profile?.adsRemoved === true, 'profile');
}

if (typeof window !== 'undefined') {
  // One-line wiring from anywhere: window.dispatchEvent(new CustomEvent('ll:profile', { detail: profile }))
  window.addEventListener('ll:profile', (e) => setAdsRemovedFromProfile((e as CustomEvent<ProfileLike | null>).detail));
}
