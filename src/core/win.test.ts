import { describe, expect, it } from 'vitest';
import { type Direction, type Owner, type TeamId } from './models';
import { cellAt, HexRhombusTopology, makeTopology } from './topology';
import { detectWin, detectWinOracle, extractPath, floodFillConnected } from './win';

const DIRS: Record<TeamId, Direction> = { A: 'horizontal', B: 'vertical' };

function emptyBoard(size: number): Owner[] {
  return new Array<Owner>(size * size).fill(null);
}

describe('detectWin — basic connections', () => {
  it('no winner on an empty board', () => {
    const topo = new HexRhombusTopology(5);
    expect(detectWin(emptyBoard(5), topo, DIRS).winner).toBeNull();
  });

  it('A wins by a straight left→right row', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    for (let c = 0; c < size; c++) owners[cellAt(2, c, size)] = 'A';
    const res = detectWin(owners, topo, DIRS);
    expect(res.winner).toBe('A');
    expect(res.path).not.toBeNull();
    expect(res.path![0]).toBe(cellAt(2, 0, size));
    expect(res.path![res.path!.length - 1]).toBe(cellAt(2, size - 1, size));
  });

  it('B wins by a straight top→bottom column', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    for (let r = 0; r < size; r++) owners[cellAt(r, 2, size)] = 'B';
    expect(detectWin(owners, topo, DIRS).winner).toBe('B');
  });

  it('does NOT declare a win when both edges are touched but not connected', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    owners[cellAt(2, 0, size)] = 'A'; // touches left
    owners[cellAt(2, size - 1, size)] = 'A'; // touches right, but isolated
    expect(detectWin(owners, topo, DIRS).winner).toBeNull();
  });

  it('a single bridging move completes the chain', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    for (let c = 0; c < size; c++) if (c !== 2) owners[cellAt(2, c, size)] = 'A';
    expect(detectWin(owners, topo, DIRS).winner).toBeNull();
    owners[cellAt(2, 2, size)] = 'A'; // bridge the gap
    expect(detectWin(owners, topo, DIRS).winner).toBe('A');
  });

  it('uses diagonal adjacency to connect a staircase', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    // Down-left staircase from top-right to bottom-left for B (vertical).
    owners[cellAt(0, 4, size)] = 'B';
    owners[cellAt(1, 3, size)] = 'B';
    owners[cellAt(2, 2, size)] = 'B';
    owners[cellAt(3, 1, size)] = 'B';
    owners[cellAt(4, 0, size)] = 'B';
    expect(detectWin(owners, topo, DIRS).winner).toBe('B');
  });
});

describe('detectWin vs flood-fill oracle (parity)', () => {
  it('agree on the staircase + row examples', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    for (let c = 0; c < size; c++) owners[cellAt(1, c, size)] = 'A';
    const dsu = detectWin(owners, topo, DIRS);
    const oracle = detectWinOracle(owners, topo, DIRS);
    expect(dsu.winner).toBe(oracle.winner);
  });
});

describe('extractPath / floodFillConnected', () => {
  it('extractPath returns a contiguous same-owner chain', () => {
    const size = 5;
    const topo = new HexRhombusTopology(size);
    const owners = emptyBoard(size);
    for (let c = 0; c < size; c++) owners[cellAt(3, c, size)] = 'A';
    const path = extractPath(owners, topo, DIRS, 'A')!;
    for (let i = 1; i < path.length; i++) {
      expect(topo.neighbors(path[i - 1])).toContain(path[i]);
      expect(owners[path[i]]).toBe('A');
    }
  });

  it('floodFill matches detectWin on the 1×1 board', () => {
    const topo = makeTopology('hex', 1);
    const owners: Owner[] = ['A'];
    // On 1×1, the single cell touches every edge → A (horizontal) connects.
    expect(floodFillConnected(owners, topo, DIRS, 'A')).toBe(true);
    expect(detectWin(owners, topo, DIRS).winner).toBe('A');
  });
});
