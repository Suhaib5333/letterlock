import { beforeEach, describe, expect, it, vi } from 'vitest';

// A minimal localStorage + window for the node environment.
function fakeStorage(seed: Record<string, string> = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    dump: () => Object.fromEntries(m),
  };
}

async function load(seed?: Record<string, string>) {
  vi.resetModules();
  const storage = fakeStorage(seed);
  vi.stubGlobal('localStorage', storage);
  const target = new EventTarget();
  vi.stubGlobal('window', target);
  const mod = await import('./entitlements');
  return { ...mod, storage, win: target };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('entitlements', () => {
  it('starts false and OR-s the store and profile sources', async () => {
    const e = await load();
    const seen: boolean[] = [];
    e.subscribeAdsRemoved(() => seen.push(e.adsRemoved()));
    expect(e.adsRemoved()).toBe(false);
    e.setAdsRemoved(true, 'store');
    expect(e.adsRemoved()).toBe(true);
    e.setAdsRemoved(true, 'profile');
    e.setAdsRemoved(false, 'store'); // store revoked but the account still owns it
    expect(e.adsRemoved()).toBe(true);
    e.setAdsRemoved(false, 'profile');
    expect(e.adsRemoved()).toBe(false);
    expect(seen).toEqual([true, false]); // notified only when the combined flag flips
  });

  it('persists to ll_ads_removed and reads it back (offline launch)', async () => {
    const e = await load();
    e.setAdsRemoved(true, 'store');
    expect(JSON.parse(e.storage.dump().ll_ads_removed)).toEqual({ store: true });
    const again = await load(e.storage.dump());
    expect(again.adsRemoved()).toBe(true);
  });

  it('accepts the legacy "1" flag and garbage without throwing', async () => {
    expect((await load({ ll_ads_removed: '1' })).adsRemoved()).toBe(true);
    expect((await load({ ll_ads_removed: '{not json' })).adsRemoved()).toBe(false);
  });

  it('setAdsRemovedFromProfile reads snake_case or camelCase; null clears the profile source', async () => {
    const e = await load();
    e.setAdsRemovedFromProfile({ ads_removed: true });
    expect(e.adsRemoved()).toBe(true);
    e.setAdsRemovedFromProfile(null);
    expect(e.adsRemoved()).toBe(false);
    e.setAdsRemovedFromProfile({ adsRemoved: true });
    expect(e.adsRemoved()).toBe(true);
  });

  it('listens for the ll:profile window event', async () => {
    const e = await load();
    e.win.dispatchEvent(new CustomEvent('ll:profile', { detail: { ads_removed: true } }));
    expect(e.adsRemoved()).toBe(true);
    e.win.dispatchEvent(new CustomEvent('ll:profile', { detail: null }));
    expect(e.adsRemoved()).toBe(false);
  });
});
