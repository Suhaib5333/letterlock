import type { GameEvent, GameLog } from './events';
import { emptyStats, opponent, type GameState, type Owner } from './models';
import { makeTopology } from './topology';
import { detectWin } from './win';

/** Build the initial game state from a GameStarted event. */
export function createGame(ev: Extract<GameEvent, { type: 'GameStarted' }>): GameState {
  const cellCount = ev.size * ev.size;
  if (ev.letters.length !== cellCount) {
    throw new Error(`letters length ${ev.letters.length} != cellCount ${cellCount}`);
  }
  return {
    size: ev.size,
    topology: ev.topology,
    owners: new Array<Owner>(cellCount).fill(null),
    letters: ev.letters.slice(),
    directions: { ...ev.directions },
    turn: ev.firstPicker,
    firstPicker: ev.firstPicker,
    status: 'playing',
    winner: null,
    winningPath: null,
    moveCount: 0,
    pieRuleEnabled: ev.pieRuleEnabled,
    pieSwapped: false,
    usedQuestions: {},
    stats: { A: emptyStats(), B: emptyStats() },
  };
}

/** True when team B (the opponent of the first picker) may invoke the pie rule. */
export function canPieSwap(s: GameState): boolean {
  return (
    s.status === 'playing' &&
    s.pieRuleEnabled &&
    !s.pieSwapped &&
    s.moveCount === 1 &&
    s.turn === opponent(s.firstPicker)
  );
}

/** Neutral, still-claimable cells (the only legal picks — plan §3.6). */
export function legalPicks(s: GameState): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.owners.length; i++) if (s.owners[i] === null) out.push(i);
  return out;
}

function addUsed(
  used: Record<string, string[]>,
  letter: string,
  id: string,
): Record<string, string[]> {
  const next = { ...used };
  const list = next[letter] ? next[letter].slice() : [];
  if (!list.includes(id)) list.push(id);
  next[letter] = list;
  return next;
}

/** Pure reducer: `apply(state, event) -> state`. Never mutates its input (plan §6.2). */
export function reduce(s: GameState, ev: GameEvent): GameState {
  switch (ev.type) {
    case 'GameStarted':
      return createGame(ev);

    case 'QuestionServed':
      return { ...s, usedQuestions: addUsed(s.usedQuestions, ev.letter, ev.questionId) };

    case 'QuestionSkipped':
      return { ...s, usedQuestions: addUsed(s.usedQuestions, ev.letter, ev.questionId) };

    case 'TurnPassed': {
      if (s.status !== 'playing') return s;
      return { ...s, turn: opponent(s.turn) };
    }

    case 'HexClaimed': {
      if (s.status !== 'playing') throw new Error('claim after game over');
      if (ev.cell < 0 || ev.cell >= s.owners.length) throw new Error('claim out of bounds');
      if (s.owners[ev.cell] !== null) throw new Error('claim on non-neutral hex');

      const topo = makeTopology(s.topology, s.size);
      const owners = s.owners.slice();
      owners[ev.cell] = ev.team;

      // Stats.
      const stats = {
        A: { ...s.stats.A },
        B: { ...s.stats.B },
      };
      stats[ev.team].claimed += 1;
      stats[ev.team].correct += 1;
      if (ev.stolen) stats[ev.team].steals += 1;
      let oppNeighbours = 0;
      for (const nb of topo.neighbors(ev.cell)) {
        if (owners[nb] === opponent(ev.team)) oppNeighbours += 1;
      }
      if (oppNeighbours >= 2) stats[ev.team].blocks += 1;

      const win = detectWin(owners, topo, s.directions);
      const moveCount = s.moveCount + 1;
      const boardFull = moveCount === s.owners.length;

      let status: GameState['status'] = 'playing';
      if (win.winner) status = 'won';
      else if (boardFull) status = 'draw'; // only reachable in square topology

      return {
        ...s,
        owners,
        stats,
        moveCount,
        // The next pick always goes to the other team relative to the current picker,
        // regardless of who actually won the contested hex.
        turn: status === 'playing' ? opponent(s.turn) : s.turn,
        status,
        winner: win.winner,
        winningPath: win.path,
      };
    }

    case 'PieSwapped': {
      if (!canPieSwap(s)) throw new Error('illegal pie swap');
      const swapper = s.turn; // opponent of first picker
      const owners = s.owners.slice();
      let swapped = false;
      for (let i = 0; i < owners.length; i++) {
        if (owners[i] === s.firstPicker) {
          owners[i] = swapper;
          swapped = true;
          break;
        }
      }
      if (!swapped) throw new Error('pie swap found no opening hex');
      const stats = { A: { ...s.stats.A }, B: { ...s.stats.B } };
      stats[s.firstPicker].claimed -= 1;
      stats[s.firstPicker].correct -= 1;
      stats[swapper].claimed += 1;
      return {
        ...s,
        owners,
        stats,
        pieSwapped: true,
        turn: s.firstPicker, // turn returns to the first picker
      };
    }
  }
}

/** Rebuild full state by replaying a log from scratch (used for undo + load). */
export function replay(log: GameLog): GameState {
  if (log.length === 0 || log[0].type !== 'GameStarted') {
    throw new Error('log must start with GameStarted');
  }
  let state = createGame(log[0]);
  for (let i = 1; i < log.length; i++) state = reduce(state, log[i]);
  return state;
}

/** Undo the last host action: truncate the log and replay (trivially correct). */
export function undoLast(log: GameLog): { log: GameLog; state: GameState } {
  if (log.length <= 1) {
    return { log: log.slice(0, 1), state: replay(log.slice(0, 1)) };
  }
  const isAction = (e: GameEvent) =>
    e.type === 'HexClaimed' || e.type === 'TurnPassed' || e.type === 'PieSwapped';
  let cut = log.length;
  // Drop any trailing bookkeeping (QuestionServed/Skipped)…
  while (cut > 1 && !isAction(log[cut - 1])) cut--;
  // …then the single last visible action itself.
  if (cut > 1) cut--;
  const trimmed = log.slice(0, cut);
  return { log: trimmed, state: replay(trimmed) };
}
