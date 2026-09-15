import { describe, expect, it, vi, afterEach } from 'vitest';

/**
 * Guard for the regression that skipped a deploy: with VITE_ADSENSE_CLIENT set,
 * the AdSense tag loaded on the Playwright hosts too and its third-party script
 * timed out four e2e shards. Vitest runs in the `node` environment, so we stub
 * the two globals the check reads rather than pulling in jsdom.
 */
function withHost(hostname: string, fn: () => Promise<void>) {
  const g = globalThis as Record<string, unknown>;
  g.window = { location: { hostname }, addEventListener: () => {}, removeEventListener: () => {} };
  g.document = {};
  return fn().finally(() => {
    delete g.window;
    delete g.document;
  });
}

describe('webAdsConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is false on a local/test host even with a real client id', async () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-7138183978612183');
    vi.resetModules();
    await withHost('localhost', async () => {
      const { webAdsConfigured } = await import('./webAds');
      expect(webAdsConfigured()).toBe(false);
    });
  });

  it('is true on the real domain with a real client id', async () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', 'ca-pub-7138183978612183');
    vi.resetModules();
    await withHost('letterlock.raltech.dev', async () => {
      const { webAdsConfigured } = await import('./webAds');
      expect(webAdsConfigured()).toBe(true);
    });
  });

  it('is false when no client id is configured', async () => {
    vi.stubEnv('VITE_ADSENSE_CLIENT', '');
    vi.resetModules();
    await withHost('letterlock.raltech.dev', async () => {
      const { webAdsConfigured } = await import('./webAds');
      expect(webAdsConfigured()).toBe(false);
    });
  });
});
