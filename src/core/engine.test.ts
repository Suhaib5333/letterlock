import { describe, expect, it } from 'vitest';
import { canPieSwap, createGame, legalPicks, reduce, replay, undoLast } from './engine';
import type { GameEvent, GameLog } from './events';
import type { Direction, TeamId } from './models';
import { cellAt } from './topology';

const DIRS: Record<TeamId, Direction> = { A: 'horizontal', B: 'vertical' };

function start(size = 5, pieRuleEnabled = false): GameEvent {
  return {
    type: 'GameStarted',
    size,
    topology: 'hex',
    letters: new Array(size * size).fill('A'),
    directions: DIRS,
    firstPicker: 'A',
    pieRuleEnabled,
  };
}

describe('createGame', () => {
  it('initialises a neutral, playable board', () => {
    const s = createGame(start(5) as never);
    expect(s.owners.every((o) => o === null)).toBe(true);
    expect(s.turn).toBe('A');
    expect(s.status).toBe('playing');
    expect(legalPicks(s)).toHaveLength(25);
  });

  it('rejects a mismatched letters array', () => {
    expect(() =>
      createGame({ ...(start(5) as never), letters: ['A'] } as never),
    ).toThrow();
  });
});

describe('claiming', () => {
  it('claims a hex, passes the turn, updates stats', () => {
    let s = createGame(start(5) as never);
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    expect(s.owners[12]).toBe('A');
    expect(s.turn).toBe('B');
    expect(s.moveCount).toBe(1);
    expect(s.stats.A.claimed).toBe(1);
    expect(s.stats.A.correct).toBe(1);
  });

  it('a steal credits the stealing team and still passes to the other picker', () => {
    let s = createGame(start(5) as never);
    // A is the picker; B steals.
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'B', stolen: true });
    expect(s.owners[12]).toBe('B');
    expect(s.stats.B.steals).toBe(1);
    expect(s.turn).toBe('B'); // next pick goes to opponent of the picker (A) → B
  });

  it('rejects claiming a non-neutral hex', () => {
    let s = createGame(start(5) as never);
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    expect(() => reduce(s, { type: 'HexClaimed', cell: 12, team: 'B', stolen: false })).toThrow();
  });

  it('declares a win and freezes the board', () => {
    let s = createGame(start(5) as never);
    for (let c = 0; c < 5; c++) {
      s = reduce(s, { type: 'HexClaimed', cell: cellAt(2, c, 5), team: 'A', stolen: false });
      if (c < 4) s = reduce(s, { type: 'TurnPassed' }); // keep A as picker for the test
    }
    expect(s.status).toBe('won');
    expect(s.winner).toBe('A');
    expect(s.winningPath).not.toBeNull();
    // No further claims allowed.
    expect(() => reduce(s, { type: 'HexClaimed', cell: 0, team: 'B', stolen: false })).toThrow();
  });
});

describe('turn passing (nobody answered)', () => {
  it('keeps the hex neutral and flips the picker', () => {
    let s = createGame(start(5) as never);
    s = reduce(s, { type: 'TurnPassed' });
    expect(s.turn).toBe('B');
    expect(s.owners.every((o) => o === null)).toBe(true);
    expect(s.moveCount).toBe(0);
  });
});

describe('pie rule', () => {
  it('is available to B only after A’s first claim', () => {
    let s = createGame(start(5, true) as never);
    expect(canPieSwap(s)).toBe(false);
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    expect(canPieSwap(s)).toBe(true); // B's turn, one move played
  });

  it('swap flips the opening hex to B and returns the turn to A', () => {
    let s = createGame(start(5, true) as never);
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    s = reduce(s, { type: 'PieSwapped' });
    expect(s.owners[12]).toBe('B');
    expect(s.turn).toBe('A');
    expect(s.pieSwapped).toBe(true);
    expect(canPieSwap(s)).toBe(false);
    expect(s.stats.B.claimed).toBe(1);
    expect(s.stats.A.claimed).toBe(0);
  });

  it('cannot swap when disabled or after the window closes', () => {
    let s = createGame(start(5, false) as never);
    s = reduce(s, { type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    expect(canPieSwap(s)).toBe(false);
    expect(() => reduce(s, { type: 'PieSwapped' })).toThrow();
  });
});

describe('question serving bookkeeping', () => {
  it('records served + skipped questions as used', () => {
    let s = createGame(start(5) as never);
    s = reduce(s, { type: 'QuestionServed', cell: 0, letter: 'A', questionId: 'A-1' });
    s = reduce(s, { type: 'QuestionSkipped', letter: 'A', questionId: 'A-2' });
    expect(s.usedQuestions['A']).toEqual(['A-1', 'A-2']);
  });
});

describe('undo = replay equivalence', () => {
  it('undoing the last claim restores the prior state exactly', () => {
    const log: GameLog = [start(5) as never];
    log.push({ type: 'HexClaimed', cell: 12, team: 'A', stolen: false });
    log.push({ type: 'TurnPassed' });
    log.push({ type: 'HexClaimed', cell: 7, team: 'B', stolen: false });
    const before = replay(log.slice(0, 3));
    const { state: after } = undoLast(log);
    expect(after.owners).toEqual(before.owners);
    expect(after.turn).toBe(before.turn);
    expect(after.moveCount).toBe(before.moveCount);
  });

  it('replay is deterministic', () => {
    const log: GameLog = [
      start(5) as never,
      { type: 'HexClaimed', cell: 12, team: 'A', stolen: false },
      { type: 'HexClaimed', cell: 7, team: 'B', stolen: false },
    ];
    expect(replay(log)).toEqual(replay(log));
  });

  it('rejects a log that does not start with GameStarted', () => {
    expect(() => replay([{ type: 'TurnPassed' }])).toThrow();
  });
});

describe('undo — full end-to-end behaviour across every action type', () => {
  it('undo of a trailing QuestionServed (no claim yet) returns to the empty pick state', () => {
    const log: GameLog = [
      start(5) as never,
      { type: 'QuestionServed', cell: 6, letter: 'A', questionId: 'A-1' },
    ];
    const { log: trimmed, state } = undoLast(log);
    expect(trimmed).toHaveLength(1); // serve dropped
    expect(state.owners.every((o) => o === null)).toBe(true);
    expect(state.turn).toBe('A');
    expect(state.moveCount).toBe(0);
  });

  it('undo of a claim makes the hex neutral again and restores the turn to the picker', () => {
    const log: GameLog = [
      start(5) as never,
      { type: 'QuestionServed', cell: 12, letter: 'A', questionId: 'A-1' },
      { type: 'HexClaimed', cell: 12, team: 'A', stolen: false },
    ];
    const claimed = replay(log);
    expect(claimed.owners[12]).toBe('A');
    expect(claimed.turn).toBe('B'); // turn flipped after the claim
    const { state } = undoLast(log);
    expect(state.owners[12]).toBe(null); // hex neutral again
    expect(state.turn).toBe('A'); // back to the picker
    expect(state.moveCount).toBe(0);
  });

  it('undo after a skip removes the whole pick (both serves + the skip)', () => {
    const log: GameLog = [
      start(5) as never,
      { type: 'QuestionServed', cell: 6, letter: 'A', questionId: 'A-1' },
      { type: 'QuestionSkipped', letter: 'A', questionId: 'A-1' },
      { type: 'QuestionServed', cell: 6, letter: 'A', questionId: 'A-2' },
    ];
    const { log: trimmed, state } = undoLast(log);
    expect(trimmed).toHaveLength(1); // all three bookkeeping events dropped
    expect(state.owners.every((o) => o === null)).toBe(true);
    expect(state.turn).toBe('A');
  });

  it('undo of a pie swap restores the pre-swap board and re-opens the swap window', () => {
    const log: GameLog = [
      start(5, true) as never,
      { type: 'QuestionServed', cell: 0, letter: 'A', questionId: 'A-1' },
      { type: 'HexClaimed', cell: 0, team: 'A', stolen: false },
      { type: 'PieSwapped' },
    ];
    const swapped = replay(log);
    expect(swapped.owners[0]).toBe('B'); // B took A's opening hex
    expect(swapped.pieSwapped).toBe(true);
    const { state } = undoLast(log);
    expect(state.owners[0]).toBe('A'); // restored to A
    expect(state.pieSwapped).toBe(false);
    expect(canPieSwap(state)).toBe(true); // swap offered again
  });

  it('undo of a manual TurnPassed (switch-turn) flips the turn back', () => {
    const log: GameLog = [
      start(5) as never,
      { type: 'QuestionServed', cell: 0, letter: 'A', questionId: 'A-1' },
      { type: 'HexClaimed', cell: 0, team: 'A', stolen: false }, // turn -> B
      { type: 'TurnPassed' }, // manual switch -> A
    ];
    expect(replay(log).turn).toBe('A');
    const { state } = undoLast(log);
    expect(state.turn).toBe('B'); // switch undone
    expect(state.owners[0]).toBe('A'); // claim untouched
  });

  it('repeated undo walks the whole game back to the start, never throwing', () => {
    let log: GameLog = [
      start(5) as never,
      { type: 'HexClaimed', cell: 0, team: 'A', stolen: false },
      { type: 'TurnPassed' },
      { type: 'HexClaimed', cell: 1, team: 'B', stolen: false },
      { type: 'TurnPassed' },
    ];
    for (let i = 0; i < 10; i++) log = undoLast(log).log; // more undos than events
    expect(log).toHaveLength(1);
    expect(() => replay(log)).not.toThrow();
  });
});
