import { describe, expect, it } from 'vitest';
import { PIECES } from './musicScore';

/**
 * The soundtrack is synthesized from these numbers, so a typo is a wrong note
 * nobody would trace back to a data table. These assert the invariants that
 * actually break the music: notes in range, the tune staying in phase with the
 * chord progression, real fifths under the bass, and no clashing downbeat.
 * Diatonic scales repeat every 7 indices, so an interval is (a - b) mod 7.
 */
const step = (a: number, b: number) => ((a - b) % 7 + 7) % 7;

describe('soundtrack score', () => {
  it('has four calm instrumental pieces', () => {
    expect(PIECES.length).toBe(4);
    expect(new Set(PIECES.map((p) => p.name)).size).toBe(4);
  });

  PIECES.forEach((p) => {
    describe(p.name, () => {
      it('is a 7-note diatonic scale', () => {
        expect(p.scale.length).toBeGreaterThanOrEqual(12);
        for (let i = 7; i < p.scale.length; i++) {
          // an index 7 higher is the same note an octave up
          expect(p.scale[i] / p.scale[i - 7]).toBeCloseTo(2, 1);
        }
      });

      it('plays only notes it actually has', () => {
        for (const [deg] of p.melody) expect(deg === -1 || (deg >= 0 && deg < p.scale.length)).toBe(true);
        for (const c of p.chords) {
          expect(c.root).toBeGreaterThanOrEqual(0);
          expect(c.fifth).toBeLessThan(p.scale.length);
        }
      });

      it('walks to a real fifth in the bass', () => {
        for (const c of p.chords) expect(step(c.fifth, c.root)).toBe(4);
      });

      it('loops in phase with the chord progression', () => {
        const beats = p.melody.reduce((n, [, b]) => n + b, 0);
        expect(beats % (4 * p.chords.length)).toBe(0); // else the tune drifts off the harmony
      });

      it('never lands a clashing note on a downbeat', () => {
        let beat = 0;
        for (const [deg, beats] of p.melody) {
          if (deg >= 0 && beat % 4 === 0) {
            const chord = p.chords[Math.floor(beat / 4) % p.chords.length];
            expect(step(deg, chord.root)).not.toBe(3); // the avoid 4th/11th over the bar's chord
          }
          beat += beats;
        }
      });

      it('stays calm and in the background', () => {
        expect(p.beat).toBeGreaterThanOrEqual(650); // no faster than ~92bpm
        expect(p.beat).toBeLessThanOrEqual(900);
        expect(p.wave).toBe('sine'); // no bright triangle harmonics
        // A swell, never a strike: a fast attack is what read as "strong and crazy".
        expect(p.attack).toBeGreaterThanOrEqual(0.05);
        expect(p.attack).toBeLessThanOrEqual(0.15);
        expect(p.harmony).toBeLessThanOrEqual(0.25); // sparse, not a chord wall
        expect(p.padGain).toBeLessThanOrEqual(0.05);
        expect(p.melody.filter(([d]) => d >= 0).length).toBeGreaterThanOrEqual(12); // a real phrase
      });
    });
  });
});
