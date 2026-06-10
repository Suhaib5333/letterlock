import { describe, expect, it } from 'vitest';
import { reduce } from './engine';
import { cellAt } from './topology';
import type { TeamConfig, TeamId } from './models';
import {
  assignmentForGame,
  isSeriesTied,
  newMatch,
  recordGameResult,
  type NewMatchOptions,
} from './match';
import type { QuestionPack } from './packs';

const TEAMS: Record<TeamId, TeamConfig> = {
  A: { id: 'A', name: 'Blue', colorId: 'blue' },
  B: { id: 'B', name: 'Amber', colorId: 'amber' },
};

const PACK: QuestionPack = {
  id: 'test',
  name: 'Test',
  locale: 'en',
  difficulty: 'medium',
  letters: Object.fromEntries(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => [l, [{ id: `${l}-0`, q: 'q', a: l }]]),
  ),
};

function opts(mode: NewMatchOptions['mode']): NewMatchOptions {
  return { mode, size: 5, teams: TEAMS, pack: PACK, seed: 42, pieRuleEnabled: true };
}

describe('direction assignment', () => {
  it('swaps direction + first picker each game', () => {
    const g0 = assignmentForGame(0);
    const g1 = assignmentForGame(1);
    expect(g0.directions.A).toBe('horizontal');
    expect(g1.directions.A).toBe('vertical');
    expect(g0.firstPicker).toBe('A');
    expect(g1.firstPicker).toBe('B');
  });
});

describe('newMatch', () => {
  it('seeds a deterministic board for a given seed', () => {
    const m1 = newMatch(opts('bo3'));
    const m2 = newMatch(opts('bo3'));
    expect(m1.currentGame.letters).toEqual(m2.currentGame.letters);
    expect(m1.gamesNeeded).toBe(2);
  });

  it('drops the single hardest letter on a 25-cell board', () => {
    const m = newMatch(opts('single'));
    const used = new Set(m.currentGame.letters);
    // Only one of 26 letters can be excluded on a 5×5 — it should be the hardest (Z).
    expect(used.has('Z')).toBe(false);
    expect(used.size).toBe(25);
  });

  it('excludes all hard letters on a 4×4 (kids) board', () => {
    const m = newMatch({ ...opts('single'), size: 4 });
    const used = new Set(m.currentGame.letters);
    for (const hard of ['X', 'Z', 'Q', 'J', 'K']) expect(used.has(hard)).toBe(false);
  });
});

function playRowWin(match: ReturnType<typeof newMatch>, team: TeamId) {
  let g = match.currentGame;
  // Force a winning row for `team` regardless of its direction this game.
  const horizontal = g.directions[team] === 'horizontal';
  for (let i = 0; i < g.size; i++) {
    const cell = horizontal ? cellAt(2, i, g.size) : cellAt(i, 2, g.size);
    g = reduce(g, { type: 'HexClaimed', cell, team, stolen: false });
    if (i < g.size - 1 && g.status === 'playing') g = reduce(g, { type: 'TurnPassed' });
  }
  return g;
}

describe('series progression', () => {
  it('a single game ends the match', () => {
    const o = opts('single');
    const match = newMatch(o);
    const finished = playRowWin(match, 'A');
    expect(finished.status).toBe('won');
    const next = recordGameResult(match, finished, o);
    expect(next.matchWinner).toBe('A');
    expect(next.seriesScore.A).toBe(1);
  });

  it('best-of-3 needs two game wins', () => {
    const o = opts('bo3');
    let match = newMatch(o);
    // Game 1: A wins.
    match = recordGameResult(match, playRowWin(match, 'A'), o);
    expect(match.matchWinner).toBeNull();
    expect(match.gamesPlayed).toBe(1);
    // Game 2: A wins again → match.
    match = recordGameResult(match, playRowWin(match, 'A'), o);
    expect(match.matchWinner).toBe('A');
    expect(match.seriesScore.A).toBe(2);
  });

  it('does not advance past a decided match', () => {
    const o = opts('single');
    let match = newMatch(o);
    match = recordGameResult(match, playRowWin(match, 'A'), o);
    expect(isSeriesTied(match)).toBe(false);
  });
});
