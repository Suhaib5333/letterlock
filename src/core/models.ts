import type { TopologyKind } from './topology';

export type TeamId = 'A' | 'B';
export type Owner = TeamId | null; // null = neutral / unclaimed
export type Direction = 'horizontal' | 'vertical'; // L↔R or T↔B
export type GameStatus = 'playing' | 'won' | 'draw';

export const OTHER: Record<TeamId, TeamId> = { A: 'B', B: 'A' };
export function opponent(t: TeamId): TeamId {
  return OTHER[t];
}

/** The two edges a direction must connect. */
export function edgesFor(direction: Direction): ['top', 'bottom'] | ['left', 'right'] {
  return direction === 'vertical' ? ['top', 'bottom'] : ['left', 'right'];
}

/**
 * Pure board + rules state for ONE game. Immutable: the reducer always returns a
 * fresh object. Fully serializable for save/resume, replay, and the Phase-2 wire
 * format (plan §6.2).
 */
export interface GameState {
  readonly size: number;
  readonly topology: TopologyKind;
  readonly owners: Owner[]; // length size*size
  readonly letters: string[]; // length size*size — letter shown on each hex
  readonly directions: Record<TeamId, Direction>;
  readonly turn: TeamId; // whose turn it is to PICK a hex
  readonly firstPicker: TeamId;
  readonly status: GameStatus;
  readonly winner: TeamId | null;
  readonly winningPath: number[] | null; // connecting chain, for the lightning trace
  readonly moveCount: number; // hexes claimed so far
  readonly pieRuleEnabled: boolean;
  readonly pieSwapped: boolean;
  readonly usedQuestions: Record<string, string[]>; // letter -> question ids already served
  /** Per-team running stats for tiebreaks / share card (plan §3.5). */
  readonly stats: Record<TeamId, TeamStats>;
}

export interface TeamStats {
  claimed: number; // hexes owned
  correct: number; // questions answered correctly (== claimed unless stolen logic differs)
  steals: number; // hexes won on the opponent's pick
  blocks: number; // claims that touched the opponent's path frontier
}

export function emptyStats(): TeamStats {
  return { claimed: 0, correct: 0, steals: 0, blocks: 0 };
}

export type MatchMode = 'single' | 'bo3' | 'bo5';
export type BoardSize = 4 | 5 | 7;

export interface TeamConfig {
  id: TeamId;
  name: string;
  colorId: string; // key into the palette (presentation)
}

/**
 * Match-level state wrapping a series of games (plan §6.2). Tracks the series
 * score, mode, and per-game direction assignment (swapped each game for fairness).
 */
export interface MatchState {
  readonly mode: MatchMode;
  readonly size: BoardSize;
  readonly topology: TopologyKind;
  readonly teams: Record<TeamId, TeamConfig>;
  readonly seriesScore: Record<TeamId, number>;
  readonly gamesPlayed: number;
  readonly gamesNeeded: number; // wins required to take the match
  readonly currentGame: GameState;
  readonly matchWinner: TeamId | null;
  readonly packId: string;
  readonly seed: number; // base seed for reproducible boards
  readonly pieRuleEnabled: boolean;
}

export function gamesNeededFor(mode: MatchMode): number {
  switch (mode) {
    case 'single':
      return 1;
    case 'bo3':
      return 2;
    case 'bo5':
      return 3;
  }
}
