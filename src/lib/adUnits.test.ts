import { describe, expect, it } from 'vitest';
import { TEST_UNITS, adUnitEnvKeys, resolveAdUnits } from './adUnits';

const REAL = {
  VITE_ADMOB_BANNER_ANDROID: 'ca-app-pub-1234567890123456/1111111111',
  VITE_ADMOB_INTERSTITIAL_ANDROID: 'ca-app-pub-1234567890123456/2222222222',
  VITE_ADMOB_REWARDED_ANDROID: 'ca-app-pub-1234567890123456/3333333333',
};

describe('resolveAdUnits', () => {
  it('uses the real ids when all three are set (prod and dev)', () => {
    for (const prod of [true, false]) {
      expect(resolveAdUnits(REAL, 'android', prod)).toEqual({
        banner: REAL.VITE_ADMOB_BANNER_ANDROID,
        interstitial: REAL.VITE_ADMOB_INTERSTITIAL_ANDROID,
        rewarded: REAL.VITE_ADMOB_REWARDED_ANDROID,
        test: false,
      });
    }
  });

  it('empty env + non-production build -> Google test ids, flagged test', () => {
    expect(resolveAdUnits({}, 'android', false)).toEqual({ ...TEST_UNITS.android, test: true });
    expect(resolveAdUnits({}, 'ios', false)).toEqual({ ...TEST_UNITS.ios, test: true });
  });

  it('empty or partial env + production build -> null (ads fully disabled, Apple 2.1)', () => {
    expect(resolveAdUnits({}, 'android', true)).toBeNull();
    expect(resolveAdUnits({ ...REAL, VITE_ADMOB_REWARDED_ANDROID: '' }, 'android', true)).toBeNull();
  });

  it('partial env + dev build fills only the gaps with test ids', () => {
    const r = resolveAdUnits({ VITE_ADMOB_BANNER_IOS: 'ca-app-pub-1234567890123456/1111111111' }, 'ios', false)!;
    expect(r.banner).toBe('ca-app-pub-1234567890123456/1111111111');
    expect(r.interstitial).toBe(TEST_UNITS.ios.interstitial);
    expect(r.test).toBe(true);
  });

  it('rejects malformed ids (a typo can never reach the SDK)', () => {
    const bad = { ...REAL, VITE_ADMOB_BANNER_ANDROID: 'ca-app-pub-123/abc' };
    expect(resolveAdUnits(bad, 'android', true)).toBeNull();
    expect(resolveAdUnits(bad, 'android', false)!.banner).toBe(TEST_UNITS.android.banner);
  });

  it('reads the platform-specific env names', () => {
    expect(adUnitEnvKeys('ios')).toEqual(['VITE_ADMOB_BANNER_IOS', 'VITE_ADMOB_INTERSTITIAL_IOS', 'VITE_ADMOB_REWARDED_IOS']);
  });
});
