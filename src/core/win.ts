import type { BoardTopology, EdgeId } from './topology';
import { UnionFind } from './unionFind';
import { edgesFor, type Direction, type Owner, type TeamId } from './models';

export interface WinResult {
  winner: TeamId | null;
  path: number[] | null; // an actual connecting chain (for the trace animation)
}

/**
 * Authoritative win detection via Union-Find with two virtual edge-nodes per team
 * (plan §6.3). Built fresh from the ownership grid — cheap for our board sizes and
 * sidesteps DSU's lack of delete (undo replays the log instead).
 *
 * A team wins iff its two edge-nodes share a root. Returns the first team found
 * connected (in Hex topology at most one can be, by the Hex theorem).
 */
export function detectWin(
  owners: readonly Owner[],
  topology: BoardTopology,
  directions: Record<TeamId, Direction>,
): WinResult {
  const n = topology.cellCount;
  // Virtual nodes: [n + 0] = A edge1, [n + 1] = A edge2, [n + 2] = B edge1, [n + 3] = B edge2.
  const uf = new UnionFind(n + 4);
  const edgeNode: Record<TeamId, [number, number]> = {
    A: [n, n + 1],
    B: [n + 2, n + 3],
  };
  const edgeIds: Record<TeamId, [EdgeId, EdgeId]> = {
    A: edgesFor(directions.A),
    B: edgesFor(directions.B),
  };

  for (let cell = 0; cell < n; cell++) {
    const owner = owners[cell];
    if (owner === null) continue;
    // Link to same-team neighbours.
    for (const nb of topology.neighbors(cell)) {
      if (owners[nb] === owner) uf.union(cell, nb);
    }
    // Link to this team's virtual edge-nodes when the cell touches an owned edge.
    const [e1, e2] = edgeIds[owner];
    const [v1, v2] = edgeNode[owner];
    if (topology.onEdge(cell, e1)) uf.union(cell, v1);
    if (topology.onEdge(cell, e2)) uf.union(cell, v2);
  }

  for (const team of ['A', 'B'] as TeamId[]) {
    const [v1, v2] = edgeNode[team];
    if (uf.connected(v1, v2)) {
      return { winner: team, path: extractPath(owners, topology, directions, team) };
    }
  }
  return { winner: null, path: null };
}

/**
 * BFS over a team's claimed cells from its first edge to its second, returning the
 * shortest connecting chain (used for the winning "lightning trace" hero animation).
 */
export function extractPath(
  owners: readonly Owner[],
  topology: BoardTopology,
  directions: Record<TeamId, Direction>,
  team: TeamId,
): number[] | null {
  const [e1, e2] = edgesFor(directions[team]);
  const n = topology.cellCount;
  const prev = new Int32Array(n).fill(-2); // -2 = unvisited, -1 = source
  const queue: number[] = [];
  for (let cell = 0; cell < n; cell++) {
    if (owners[cell] === team && topology.onEdge(cell, e1)) {
      prev[cell] = -1;
      queue.push(cell);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const cell = queue[head++];
    if (topology.onEdge(cell, e2)) {
      // Reconstruct.
      const path: number[] = [];
      let c = cell;
      while (c !== -1) {
        path.push(c);
        c = prev[c];
      }
      return path.reverse();
    }
    for (const nb of topology.neighbors(cell)) {
      if (owners[nb] === team && prev[nb] === -2) {
        prev[nb] = cell;
        queue.push(nb);
      }
    }
  }
  return null;
}

/**
 * Independent flood-fill oracle (plan §6.3 / §12). Deliberately a different
 * algorithm from the DSU so tests can cross-check them on random legal games.
 */
export function floodFillConnected(
  owners: readonly Owner[],
  topology: BoardTopology,
  directions: Record<TeamId, Direction>,
  team: TeamId,
): boolean {
  const [e1, e2] = edgesFor(directions[team]);
  const n = topology.cellCount;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  for (let cell = 0; cell < n; cell++) {
    if (owners[cell] === team && topology.onEdge(cell, e1)) {
      seen[cell] = 1;
      stack.push(cell);
    }
  }
  while (stack.length) {
    const cell = stack.pop()!;
    if (topology.onEdge(cell, e2)) return true;
    for (const nb of topology.neighbors(cell)) {
      if (owners[nb] === team && !seen[nb]) {
        seen[nb] = 1;
        stack.push(nb);
      }
    }
  }
  return false;
}

/** Oracle wrapper returning the same shape as detectWin, for test parity. */
export function detectWinOracle(
  owners: readonly Owner[],
  topology: BoardTopology,
  directions: Record<TeamId, Direction>,
): WinResult {
  for (const team of ['A', 'B'] as TeamId[]) {
    if (floodFillConnected(owners, topology, directions, team)) {
      return { winner: team, path: extractPath(owners, topology, directions, team) };
    }
  }
  return { winner: null, path: null };
}
