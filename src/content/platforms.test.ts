import { describe, expect, it } from 'vitest';
import { compareVersions, updateRequired } from '../lib/appConfig';
import { packAllowedOn, packNeedsRemoteMedia } from '../core/packs';
import { PACKS } from './index';

// LAUNCH_PLAN D3: anything built on iTunes previews is web only. A pack that
// carries an itunes.apple.com / mzstatic.com URL and is NOT gated would ship
// inside the store builds and fail Apple review (5.2.5).
const ITUNES = /(itunes\.apple\.com|mzstatic\.com)\//i;

function hasItunesMedia(pack: (typeof PACKS)[number]): boolean {
  return Object.values(pack.letters).some((qs) =>
    qs.some((q) => ITUNES.test(q.audio ?? '') || ITUNES.test(q.video ?? '') || ITUNES.test(q.image ?? '')),
  );
}

describe('platform gating of iTunes-preview packs (D3)', () => {
  const itunesPacks = PACKS.filter(hasItunesMedia);

  it('finds the iTunes-based packs (songs, tv clips, sitcom + decade clips, melodies extra)', () => {
    const ids = itunesPacks.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['songs', 'songs-rock', 'tv-clips', 'melodies']));
  });

  for (const pack of itunesPacks) {
    it(`${pack.id} is platforms: ['web']`, () => {
      expect(pack.platforms).toEqual(['web']);
      expect(packAllowedOn(pack, 'native')).toBe(false);
      expect(packAllowedOn(pack, 'web')).toBe(true);
    });
  }

  it('packs without iTunes media are not web-gated', () => {
    for (const pack of PACKS) {
      if (!hasItunesMedia(pack)) {
        expect(pack.platforms, `${pack.id} should ship everywhere`).toBeUndefined();
      }
    }
  });

  it('a pack with same-origin clips only does not need remote media', () => {
    const local = PACKS.find((p) => p.id === 'flags-easy');
    expect(local).toBeDefined();
    // Bundled flags live under /flags/*.svg (same origin).
    expect(packNeedsRemoteMedia(local!, 'https://letterlock.raltech.dev')).toBe(false);
    const remote = PACKS.find((p) => p.id === 'songs')!;
    expect(packNeedsRemoteMedia(remote, 'https://letterlock.raltech.dev')).toBe(true);
  });
});

describe('version gate', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0')).toBe(0);
    expect(compareVersions('0.9', '1.0.0')).toBe(-1);
  });
  it('requires an update only when minBundle is newer than the build', () => {
    expect(updateRequired({ minBundle: '2.0.0' }, '1.0.0')).toBe(true);
    expect(updateRequired({ minBundle: '1.0.0' }, '1.0.0')).toBe(false);
    expect(updateRequired({ maintenance: true }, '1.0.0')).toBe(false);
    expect(updateRequired(null, '1.0.0')).toBe(false);
  });
});
