import { describe, expect, it } from 'vitest';
import {
  HexRhombusTopology,
  SquareGridTopology,
  cellAt,
  colOf,
  makeTopology,
  rowOf,
} from './topology';

describe('coordinate helpers', () => {
  it('round-trips row/col <-> cell', () => {
    const size = 5;
    for (let cell = 0; cell < size * size; cell++) {
      const r = rowOf(cell, size);
      const c = colOf(cell, size);
      expect(cellAt(r, c, size)).toBe(cell);
    }
  });
});

describe('HexRhombusTopology', () => {
  const topo = new HexRhombusTopology(5);

  it('has 6 neighbours for an interior cell', () => {
    const center = cellAt(2, 2, 5);
    expect(topo.neighbors(center)).toHaveLength(6);
  });

  it('neighbour relation is symmetric', () => {
    for (let a = 0; a < topo.cellCount; a++) {
      for (const b of topo.neighbors(a)) {
        expect(topo.neighbors(b)).toContain(a);
      }
    }
  });

  it('corner cells have fewer neighbours', () => {
    expect(topo.neighbors(cellAt(0, 0, 5)).length).toBeLessThan(6);
    expect(topo.neighbors(cellAt(4, 4, 5)).length).toBeLessThan(6);
  });

  it('identifies edges correctly', () => {
    expect(topo.onEdge(cellAt(0, 3, 5), 'top')).toBe(true);
    expect(topo.onEdge(cellAt(4, 1, 5), 'bottom')).toBe(true);
    expect(topo.onEdge(cellAt(2, 0, 5), 'left')).toBe(true);
    expect(topo.onEdge(cellAt(2, 4, 5), 'right')).toBe(true);
    expect(topo.onEdge(cellAt(2, 2, 5), 'top')).toBe(false);
  });

  it('includes the two diagonal neighbours (the fairness adjacency)', () => {
    const c = cellAt(2, 2, 5);
    expect(topo.neighbors(c)).toContain(cellAt(1, 3, 5)); // up-right
    expect(topo.neighbors(c)).toContain(cellAt(3, 1, 5)); // down-left
  });
});

describe('SquareGridTopology', () => {
  const topo = new SquareGridTopology(5);
  it('has 4 neighbours for an interior cell', () => {
    expect(topo.neighbors(cellAt(2, 2, 5))).toHaveLength(4);
  });
  it('has no diagonal neighbours', () => {
    const c = cellAt(2, 2, 5);
    expect(topo.neighbors(c)).not.toContain(cellAt(1, 3, 5));
  });
});

describe('makeTopology', () => {
  it('selects the right implementation', () => {
    expect(makeTopology('hex', 5).kind).toBe('hex');
    expect(makeTopology('square', 5).kind).toBe('square');
  });
});
