import { describe, expect, it } from 'vitest';
import { pickNext, score, type Rect } from './spatialNav';

const r = (left: number, top: number, w: number, h: number): Rect => ({ left, top, right: left + w, bottom: top + h });

describe('spatial nav: nearest rectangle', () => {
  const from = r(100, 100, 100, 40);

  it('ignores candidates that are not in the direction of travel', () => {
    expect(score(from, r(0, 100, 50, 40), 'right')).toBeNull(); // behind
    expect(score(from, r(100, 100, 100, 40), 'right')).toBeNull(); // itself
    expect(score(from, r(120, 200, 100, 40), 'right')).toBeNull(); // below, not right
    expect(score(from, r(120, 200, 100, 40), 'down')).not.toBeNull();
  });

  it('prefers the nearest along the travel axis', () => {
    const near = r(220, 100, 100, 40);
    const far = r(400, 100, 100, 40);
    expect(pickNext(from, [far, near], 'right')).toBe(1);
    expect(pickNext(from, [r(100, 0, 100, 40), r(100, 50, 100, 40)], 'up')).toBe(1);
  });

  it('prefers on-axis over off-axis at similar distance', () => {
    const onAxis = r(240, 100, 100, 40);
    const offAxis = r(220, 300, 100, 40);
    expect(pickNext(from, [offAxis, onAxis], 'right')).toBe(1);
    expect(pickNext(from, [r(300, 160, 40, 40), r(100, 160, 100, 40)], 'down')).toBe(1);
  });

  it('returns -1 when nothing lies that way', () => {
    expect(pickNext(from, [r(0, 0, 50, 50)], 'right')).toBe(-1);
    expect(pickNext(from, [], 'left')).toBe(-1);
  });

  it('walks a pointy-top hex grid: right = same row, down = the next row', () => {
    // Row 0 at y=0, row 1 shifted right by half a hex and down by 0.75h.
    const w = 80;
    const h = 92;
    const row0 = [0, 1, 2].map((c) => r(c * w, 0, w, h));
    const row1 = [0, 1, 2].map((c) => r(c * w + w / 2, 0.75 * h, w, h));
    const all = [...row0, ...row1];
    expect(pickNext(row0[0], all, 'right')).toBe(1); // row0[1], not the below-right hex
    const down = pickNext(row0[1], all, 'down');
    expect([3, 4]).toContain(down); // one of the two hexes touching it from below
    expect(pickNext(row1[1], all, 'up')).not.toBe(-1);
    expect(pickNext(row1[2], all, 'left')).toBe(4);
  });
});
