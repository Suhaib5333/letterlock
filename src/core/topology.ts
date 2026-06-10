/**
 * Pluggable board topology (plan §6.1).
 *
 * Both topologies feed the SAME union-find win check. Hex is the default and is
 * provably draw-free (the Hex theorem). Square is an optional future "draws
 * possible" mode and is wired here so the engine never has to fork.
 *
 * Cells are indexed row-major: `cell = row * size + col`, with row/col in [0, size).
 */
export type TopologyKind = 'hex' | 'square';
export type EdgeId = 'top' | 'bottom' | 'left' | 'right';

export interface BoardTopology {
  readonly kind: TopologyKind;
  readonly size: number;
  readonly cellCount: number;
  neighbors(cell: number): number[];
  onEdge(cell: number, edge: EdgeId): boolean;
}

export function rowOf(cell: number, size: number): number {
  return Math.floor(cell / size);
}
export function colOf(cell: number, size: number): number {
  return cell % size;
}
export function cellAt(row: number, col: number, size: number): number {
  return row * size + col;
}

abstract class BaseTopology implements BoardTopology {
  abstract readonly kind: TopologyKind;
  protected readonly _neighbors: number[][];
  constructor(public readonly size: number, deltas: readonly [number, number][]) {
    this._neighbors = [];
    for (let cell = 0; cell < size * size; cell++) {
      const r = rowOf(cell, size);
      const c = colOf(cell, size);
      const list: number[] = [];
      for (const [dr, dc] of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          list.push(cellAt(nr, nc, size));
        }
      }
      this._neighbors.push(list);
    }
  }
  get cellCount(): number {
    return this.size * this.size;
  }
  neighbors(cell: number): number[] {
    return this._neighbors[cell];
  }
  onEdge(cell: number, edge: EdgeId): boolean {
    const r = rowOf(cell, this.size);
    const c = colOf(cell, this.size);
    switch (edge) {
      case 'top':
        return r === 0;
      case 'bottom':
        return r === this.size - 1;
      case 'left':
        return c === 0;
      case 'right':
        return c === this.size - 1;
    }
  }
}

/**
 * Game-of-Hex rhombus: pointy-top hexagons on a parallelogram, 6-neighbour
 * adjacency. The two diagonal neighbours (up-right, down-left) are what make
 * both connection directions identical length — the fairness fix (plan §2).
 */
export class HexRhombusTopology extends BaseTopology {
  readonly kind = 'hex' as const;
  constructor(size: number) {
    super(size, [
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
    ]);
  }
}

/** 4-neighbour square grid — optional mode where true board draws are possible. */
export class SquareGridTopology extends BaseTopology {
  readonly kind = 'square' as const;
  constructor(size: number) {
    super(size, [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  }
}

export function makeTopology(kind: TopologyKind, size: number): BoardTopology {
  return kind === 'square' ? new SquareGridTopology(size) : new HexRhombusTopology(size);
}
