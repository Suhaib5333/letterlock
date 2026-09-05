import { describe, expect, it } from 'vitest';
import {
  INTERSTITIAL_CAP_MS,
  interstitialDue,
  placementAllowed,
  shouldShowAds,
} from './adPolicy';

const ok = { enabled: true, consentDone: true, adsRemoved: false, tv: false };

describe('shouldShowAds', () => {
  it('needs every condition', () => {
    expect(shouldShowAds(ok)).toBe(true);
    expect(shouldShowAds({ ...ok, enabled: false })).toBe(false);
    expect(shouldShowAds({ ...ok, consentDone: false })).toBe(false);
    expect(shouldShowAds({ ...ok, adsRemoved: true })).toBe(false);
    expect(shouldShowAds({ ...ok, tv: true })).toBe(false);
  });
});

describe('placementAllowed', () => {
  it('banner only on Home and the lobby, never with a question open', () => {
    expect(placementAllowed('banner', { screen: 'home' })).toBe(true);
    expect(placementAllowed('banner', { screen: 'lobby-host' })).toBe(true);
    expect(placementAllowed('banner', { screen: 'game' })).toBe(false);
    expect(placementAllowed('banner', { screen: 'setup' })).toBe(false);
    expect(placementAllowed('banner', { screen: 'home', questionLive: true })).toBe(false);
  });
  it('interstitial only between games, never mid-question', () => {
    expect(placementAllowed('interstitial', { screen: 'game' })).toBe(true);
    expect(placementAllowed('interstitial', { screen: 'victory' })).toBe(true);
    expect(placementAllowed('interstitial', { screen: 'game', questionLive: true })).toBe(false);
    expect(placementAllowed('interstitial', { screen: 'home' })).toBe(false);
  });
  it('rewarded is opt-in and always allowed by placement', () => {
    expect(placementAllowed('rewarded', { screen: 'game', questionLive: true })).toBe(true);
  });
});

describe('interstitialDue', () => {
  it('caps to one per 4 minutes', () => {
    const t0 = 1_000_000;
    expect(interstitialDue(t0, t0 + INTERSTITIAL_CAP_MS - 1)).toBe(false);
    expect(interstitialDue(t0, t0 + INTERSTITIAL_CAP_MS)).toBe(true);
    expect(interstitialDue(t0, t0 + 10 * 60_000)).toBe(true);
  });
  it('the cap starts at app open, so nothing shows right after launch', () => {
    const open = Date.now();
    expect(interstitialDue(open, open + 5_000)).toBe(false);
  });
});
