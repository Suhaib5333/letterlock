import { createGame } from './engine';
import type { GameEvent } from './events';
import {
  gamesNeededFor,
  opponent,
  type BoardSize,
  type Direction,
  type GameState,
  type MatchMode,
  type MatchState,
  type TeamConfig,
  type TeamId,
} from './models';
import { placeLetters, type QuestionPack } from './packs';
import { mulberry32, type Rng } from './rng';
import type { TopologyKind } from './topology';

export interface NewMatchOptions {
  mode: MatchMode;
  size: BoardSize;
  topology?: TopologyKind;
  teams: Record<TeamId, TeamConfig>;
  pack: QuestionPack;
  seed: number;
  pieRuleEnabled: boolean;
  biasOutHard?: boolean;
}

/**
 * Direction + first-picker assignment for game `index` in a series. Swapped every
 * game for fairness (plan §3.1 / §2.4). Game 0: A=horizontal, B=vertical, A picks.
 */
export function assignmentForGame(index: number): {
  directions: Record<TeamId, Direction>;
  firstPicker: TeamId;
} {
  const even = index % 2 === 0;
  return {
    directions: even
      ? { A: 'horizontal', B: 'vertical' }
      : { A: 'vertical', B: 'horizontal' },
    firstPicker: even ? 'A' : 'B',
  };
}

/** Build the GameStarted event for game `index` of a match. */
export function startGameEvent(opts: NewMatchOptions, index: number): GameEvent {
  const rng: Rng = mulberry32((opts.seed + index * 0x9e3779b1) >>> 0);
  const cellCount = opts.size * opts.size;
  const letters = placeLetters(cellCount, opts.pack, rng, opts.biasOutHard ?? true);
  const { directions, firstPicker } = assignmentForGame(index);
  return {
    type: 'GameStarted',
    size: opts.size,
    topology: opts.topology ?? 'hex',
    letters,
    directions,
    firstPicker,
    pieRuleEnabled: opts.pieRuleEnabled,
  };
}

export function newMatch(opts: NewMatchOptions): MatchState {
  const startEv = startGameEvent(opts, 0);
  return {
    mode: opts.mode,
    size: opts.size,
    topology: opts.topology ?? 'hex',
    teams: opts.teams,
    seriesScore: { A: 0, B: 0 },
    gamesPlayed: 0,
    gamesNeeded: gamesNeededFor(opts.mode),
    currentGame: createGame(startEv as Extract<GameEvent, { type: 'GameStarted' }>),
    matchWinner: null,
    packId: opts.pack.id,
    seed: opts.seed,
    pieRuleEnabled: opts.pieRuleEnabled,
  };
}

/**
 * Fold a finished game into the match: bump the series score, decide if the match
 * is won, and otherwise prepare the next game (swapped directions + fresh letters).
 */
export function recordGameResult(
  match: MatchState,
  finished: GameState,
  opts: NewMatchOptions,
): MatchState {
  if (finished.status !== 'won' && finished.status !== 'draw') return match;
  const seriesScore = { ...match.seriesScore };
  if (finished.winner) seriesScore[finished.winner] += 1;
  const gamesPlayed = match.gamesPlayed + 1;

  let matchWinner: TeamId | null = null;
  if (seriesScore.A >= match.gamesNeeded) matchWinner = 'A';
  else if (seriesScore.B >= match.gamesNeeded) matchWinner = 'B';

  let currentGame = finished;
  if (!matchWinner) {
    const nextEv = startGameEvent(opts, gamesPlayed);
    currentGame = createGame(nextEv as Extract<GameEvent, { type: 'GameStarted' }>);
  }

  return { ...match, seriesScore, gamesPlayed, matchWinner, currentGame };
}

/** Is the series tied with no more decisive games possible? (even-format safeguard). */
export function isSeriesTied(match: MatchState): boolean {
  const maxGames =
    match.mode === 'single' ? 1 : match.mode === 'bo3' ? 3 : 5;
  return (
    match.gamesPlayed >= maxGames &&
    match.matchWinner === null &&
    match.seriesScore.A === match.seriesScore.B
  );
}

export { opponent };
