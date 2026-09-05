import { describe, expect, it } from 'vitest';
import { decideOta, runningBundleVersion } from './ota';

const sha = 'a'.repeat(64);
const latest = { version: '1.2.0', url: 'https://api.letterlock.raltech.dev/bundles/1.2.0.zip', sha256: sha, minNative: '1.0.0' };

describe('decideOta', () => {
  it('installs a newer, valid bundle the shell can run', () => {
    expect(decideOta(latest, '1.1.9', '1.0.0')).toEqual({ action: 'install' });
    expect(decideOta(latest, '1.1.9', '2.3.0')).toEqual({ action: 'install' });
  });
  it('skips when nothing is published', () => {
    expect(decideOta(null, '1.0.0', '1.0.0')).toEqual({ action: 'skip', reason: 'none' });
    expect(decideOta(undefined, '1.0.0', '1.0.0')).toEqual({ action: 'skip', reason: 'none' });
  });
  it('skips the same or an older version', () => {
    expect(decideOta(latest, '1.2.0', '1.0.0')).toEqual({ action: 'skip', reason: 'not-newer' });
    expect(decideOta(latest, '1.10.0', '1.0.0')).toEqual({ action: 'skip', reason: 'not-newer' });
  });
  it('blocks a shell older than minNative (native change must go through the stores)', () => {
    expect(decideOta({ ...latest, minNative: '1.1.0' }, '1.0.0', '1.0.9')).toEqual({ action: 'skip', reason: 'native-too-old' });
    expect(decideOta({ ...latest, minNative: '1.1.0' }, '1.0.0', '1.1.0')).toEqual({ action: 'install' });
    expect(decideOta({ ...latest, minNative: undefined }, '1.0.0', '0.0.1')).toEqual({ action: 'install' });
  });
  it('refuses malformed metadata (bad version, non-https url, no real sha256)', () => {
    expect(decideOta({ ...latest, version: 'v1.2' }, '1.0.0', '1.0.0').action).toBe('skip');
    expect(decideOta({ ...latest, url: 'http://evil/x.zip' }, '1.0.0', '1.0.0')).toEqual({ action: 'skip', reason: 'invalid' });
    expect(decideOta({ ...latest, sha256: 'abc' }, '1.0.0', '1.0.0')).toEqual({ action: 'skip', reason: 'invalid' });
    expect(decideOta({ ...latest, minNative: 'latest' }, '1.0.0', '1.0.0')).toEqual({ action: 'skip', reason: 'native-too-old' });
  });
});

describe('runningBundleVersion', () => {
  it('builtin bundle -> the version Vite baked in', () => {
    expect(runningBundleVersion('builtin', 'builtin', '1.0.0')).toBe('1.0.0');
  });
  it('downloaded bundle -> its own version, never below the builtin', () => {
    expect(runningBundleVersion('abc123', '1.0.3', '1.0.0')).toBe('1.0.3');
    expect(runningBundleVersion('abc123', '0.9.0', '1.0.0')).toBe('1.0.0');
    expect(runningBundleVersion('abc123', 'unknown', '1.0.0')).toBe('1.0.0');
  });
});
