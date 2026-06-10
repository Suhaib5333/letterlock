import { describe, expect, it } from 'vitest';
import { type Direction, type Owner, type TeamId } from './models';
import { mulberry32, shuffle } from './rng';
import { makeTopology } from './topology';
import { detectWin, detectWinOracle, floodFillConnected } from './win';

const DIRS: Record<TeamId, Direction> = { A: 'horizontal', B: 'vertical' };

/**
 * The Hex theorem (plan §2.2): on a COMPLETELY filled Hex board, EXACTLY ONE
 * player has connected their two edges — never zero, never both. This is the
 * mathematical guarantee that the board can never draw. We fuzz it hard.
 */
describe('Hex theorem — exactly one winner on a full board', () => {
  for (const size of [2, 3, 4, 5, 7]) {
    it(`holds for ${size}×${size} across 400 random fillings`, () => {
      const topo = makeTopology('hex', size);
      const rng = mulberry32(0xc0ffee ^ size);
      for (let trial = 0; trial < 400; trial++) {
        const owners: Owner[] = [];
        for (let i = 0; i < topo.cellCount; i++) owners.push(rng() < 0.5 ? 'A' : 'B');
        const aWins = floodFillConnected(owners, topo, DIRS, 'A');
        const bWins = floodFillConnected(owners, topo, DIRS, 'B');
        // Exactly one — the theorem.
        expect(aWins).not.toBe(bWins);
      }
    });
  }
});

/**
 * DSU (authoritative) must agree with the independent flood-fill oracle on every
 * random legal position — partial and full (plan §6.3 / §12).
 */
describe('Union-Find vs flood-fill oracle — full parity', () => {
  for (const size of [3, 4, 5, 7]) {
    it(`agree over 600 random partial boards on ${size}×${size}`, () => {
      const topo = makeTopology('hex', size);
      const rng = mulberry32(0xbeef ^ (size * 31));
      for (let trial = 0; trial < 600; trial++) {
        const owners: Owner[] = new Array(topo.cellCount).fill(null);
        // Random density of claimed cells, randomly split.
        for (let i = 0; i < topo.cellCount; i++) {
          const r = rng();
          owners[i] = r < 0.33 ? null : r < 0.66 ? 'A' : 'B';
        }
        const dsu = detectWin(owners, topo, DIRS);
        const oracle = detectWinOracle(owners, topo, DIRS);
        expect(dsu.winner).toBe(oracle.winner);
      }
    });
  }
});

/**
 * Simulate full, legal, alternating games to a natural conclusion and verify the
 * winner is sound (its claimed cells really connect its two edges).
 */
describe('simulated legal games always end in a sound win', () => {
  for (const size of [3, 4, 5, 7]) {
    it(`${size}×${size}: 200 games each produce a verifiable winner`, () => {
      const topo = makeTopology('hex', size);
      const rng = mulberry32(0x1234 ^ size);
      for (let trial = 0; trial < 200; trial++) {
        const owners: Owner[] = new Array(topo.cellCount).fill(null);
        const order = shuffle(
          Array.from({ length: topo.cellCount }, (_, i) => i),
          rng,
        );
        let turn: TeamId = 'A';
        let winner: TeamId | null = null;
        for (const cell of order) {
          owners[cell] = turn;
          const res = detectWin(owners, topo, DIRS);
          if (res.winner) {
            winner = res.winner;
            // The reported path must be a real same-owner chain edge-to-edge.
            expect(floodFillConnected(owners, topo, DIRS, winner)).toBe(true);
            break;
          }
          turn = turn === 'A' ? 'B' : 'A';
        }
        // A full Hex board always yields a winner.
        expect(winner).not.toBeNull();
      }
    });
  }
});

describe('square topology CAN draw (full board, no connection)', () => {
  it('finds at least one drawn square board where neither side connects', () => {
    const size = 4;
    const topo = makeTopology('square', size);
    const rng = mulberry32(99);
    let foundDraw = false;
    for (let trial = 0; trial < 2000 && !foundDraw; trial++) {
      const owners: Owner[] = [];
      for (let i = 0; i < topo.cellCount; i++) owners.push(rng() < 0.5 ? 'A' : 'B');
      const a = floodFillConnected(owners, topo, DIRS, 'A');
      const b = floodFillConnected(owners, topo, DIRS, 'B');
      if (!a && !b) foundDraw = true;
    }
    expect(foundDraw).toBe(true);
  });
});
