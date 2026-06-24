import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { canPieSwap, replay, undoLast } from '../core/engine';
import type { GameEvent, GameLog } from '../core/events';
import { gamesNeededFor, type GameState, type TeamConfig, type TeamId } from '../core/models';
import { allQuestionIds, allQuestions, type Question, type QuestionPack } from '../core/packs';
import { mulberry32 } from '../core/rng';
import { newMatch, startGameEvent, type NewMatchOptions } from '../core/match';
import { DEFAULT_PACK_ID, packById } from '../content';
import { markServed, usedSet } from './progress';
import {
  clearSave,
  getSavedGame,
  hasSavedGame as hasSavedGameModule,
  saveGame,
  subscribeSavedGame,
} from './savedGame';
import { colorById } from './palette';
import {
  DEFAULT_SETTINGS,
  type Screen,
  type Settings,
  type SetupForm,
  type UiState,
} from './types';

const SETTINGS_KEY = 'letterlock.settings.v1';

interface Series {
  A: number;
  B: number;
  gamesPlayed: number;
  matchWinner: TeamId | null;
  gamesNeeded: number;
}

export interface StoreState {
  screen: Screen;
  settings: Settings;
  setup: SetupForm;
  opts: NewMatchOptions | null;
  series: Series;
  log: GameLog;
  game: GameState;
  ui: UiState;
  // True when the player chose Online Mode: Setup is done first, THEN the lobby
  // code is shown (so team colours are picked before sharing the room).
  online: boolean;
}

const EMPTY_UI: UiState = {
  phase: 'pick',
  selectedCell: null,
  served: null,
  answerRevealed: false,
  gameOver: false,
  lastClaimCell: null,
  blockHint: false,
  pulse: 0,
  skipsUsed: 0,
  autoSkips: 0,
  repeated: false,
};

const DEFAULT_SETUP: SetupForm = {
  colorA: 'blue',
  colorB: 'amber',
  mode: 'bo3',
  size: 5,
  topology: 'hex',
  pieRule: true,
  timer: 30,
  packId: DEFAULT_PACK_ID,
};

// A harmless placeholder game so `state.game` is always defined before a match starts.
const PLACEHOLDER_GAME = replay([
  {
    type: 'GameStarted',
    size: 5,
    topology: 'hex',
    letters: new Array(25).fill('A'),
    directions: { A: 'horizontal', B: 'vertical' },
    firstPicker: 'A',
    pieRuleEnabled: true,
  },
]);

type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_ONLINE'; value: boolean }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'UPDATE_SETUP'; patch: Partial<SetupForm> }
  | { type: 'START_MATCH' }
  | { type: 'PICK_CELL'; cell: number }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'SKIP_QUESTION' }
  | { type: 'AUTO_SKIP' }
  | { type: 'ADJUDICATE'; team: TeamId | null }
  | { type: 'PIE_SWAP' }
  | { type: 'SWITCH_TURN' }
  | { type: 'UNDO' }
  | { type: 'CONTINUE_AFTER_GAME' }
  | { type: 'REMATCH' }
  | { type: 'EXIT_HOME' }
  | { type: 'HYDRATE'; payload: Partial<StoreState> };

function teamsFromSetup(setup: SetupForm): Record<TeamId, TeamConfig> {
  return {
    A: { id: 'A', name: colorById(setup.colorA).name, colorId: setup.colorA },
    B: { id: 'B', name: colorById(setup.colorB).name, colorId: setup.colorB },
  };
}

function optsFromSetup(setup: SetupForm, seed: number): NewMatchOptions {
  return {
    mode: setup.mode,
    size: setup.size,
    topology: setup.topology,
    teams: teamsFromSetup(setup),
    pack: packById(setup.packId),
    seed,
    pieRuleEnabled: setup.pieRule,
    biasOutHard: true,
  };
}

/**
 * Pick the question to serve for a cell.
 * - Honours the cross-game no-repeat cycle (unseen-first; {@link usedSet}).
 * - For letterless packs (`hideBoardLetters`) tiles are NOT pinned to a letter —
 *   any tile draws from the WHOLE pack, fully randomized.
 * - `repeated` is true when every candidate has already been served this cycle
 *   (a forced repeat) so the UI can flag it.
 */
function chooseQuestion(
  opts: NewMatchOptions,
  game: GameState,
  cell: number,
): { question: Question; letter: string; repeated: boolean } {
  const pack = opts.pack as QuestionPack;
  const global = !!pack.hideBoardLetters;

  // Candidate pool: whole pack for letterless packs, else this cell's letter.
  let letter = game.letters[cell];
  let pool: Question[] = global ? allQuestions(pack) : pack.letters[letter] ?? [];
  if (pool.length === 0) pool = allQuestions(pack); // wildcard fallback

  // Ids already served — this game (avoid same-game dupes) + persistent cycle.
  const gameUsed = new Set<string>();
  if (global) {
    for (const ids of Object.values(game.usedQuestions)) for (const id of ids) gameUsed.add(id);
  } else {
    for (const id of game.usedQuestions[letter] ?? []) gameUsed.add(id);
  }
  const pers = usedSet(pack.id);

  const seed = (opts.seed + cell * 131 + game.moveCount * 977 + gameUsed.size * 7919) >>> 0;
  const rng = mulberry32(seed);

  const unseen = pool.filter((q) => !pers.has(q.id) && !gameUsed.has(q.id));
  let chosen: Question;
  let repeated: boolean;
  if (unseen.length > 0) {
    chosen = unseen[Math.floor(rng() * unseen.length)];
    repeated = false;
  } else {
    const fresh = pool.filter((q) => !gameUsed.has(q.id));
    const fallback = fresh.length > 0 ? fresh : pool;
    chosen = fallback[Math.floor(rng() * fallback.length)];
    repeated = true;
  }
  // Event letter: for letterless packs use the answer's own first letter so the
  // move log + usedQuestions stay consistent; otherwise the board cell's letter.
  if (global) letter = chosen.a.trim()[0]?.toUpperCase() || 'A';
  return { question: chosen, letter, repeated };
}

function applyAndAdvance(state: StoreState, events: GameEvent[]): StoreState {
  const log = [...state.log, ...events];
  const game = replay(log);
  const claim = events.find((e) => e.type === 'HexClaimed') as
    | Extract<GameEvent, { type: 'HexClaimed' }>
    | undefined;
  const blockHint =
    !!claim && game.stats[claim.team].blocks > state.game.stats[claim.team].blocks;
  return {
    ...state,
    log,
    game,
    ui: {
      ...EMPTY_UI,
      gameOver: game.status !== 'playing',
      lastClaimCell: claim ? claim.cell : null,
      blockHint,
      pulse: state.ui.pulse + 1,
    },
  };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_ONLINE':
      return { ...state, online: action.value };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'UPDATE_SETUP':
      return { ...state, setup: { ...state.setup, ...action.patch } };

    case 'START_MATCH': {
      const seed = (Date.now() >>> 0) ^ 0x5bd1e995;
      const opts = optsFromSetup(state.setup, seed);
      const match = newMatch(opts);
      const log: GameLog = [startGameEvent(opts, 0)];
      return {
        ...state,
        screen: 'game',
        opts,
        series: {
          A: 0,
          B: 0,
          gamesPlayed: 0,
          matchWinner: null,
          gamesNeeded: gamesNeededFor(opts.mode),
        },
        log,
        game: match.currentGame,
        ui: { ...EMPTY_UI },
      };
    }

    case 'PICK_CELL': {
      if (!state.opts || state.game.status !== 'playing') return state;
      if (state.game.owners[action.cell] !== null) return state; // only neutral hexes
      const { question, letter, repeated } = chooseQuestion(state.opts, state.game, action.cell);
      const ev: GameEvent = {
        type: 'QuestionServed',
        cell: action.cell,
        letter,
        questionId: question.id,
      };
      const log = [...state.log, ev];
      return {
        ...state,
        log,
        game: replay(log),
        ui: {
          ...state.ui,
          phase: 'question',
          selectedCell: action.cell,
          served: { question, letter, cell: action.cell },
          answerRevealed: false,
          skipsUsed: 0, // a fresh pick resets the skip allowance + timer
          autoSkips: 0, // and the auto-advance (unreachable-media) counter
          repeated,
        },
      };
    }

    case 'REVEAL_ANSWER':
      return { ...state, ui: { ...state.ui, answerRevealed: true } };

    case 'SKIP_QUESTION': {
      if (!state.opts || !state.ui.served) return state;
      if (state.ui.skipsUsed >= 1) return state; // only ONE skip per pick (user request)
      const cell = state.ui.served.cell;
      const skip: GameEvent = {
        type: 'QuestionSkipped',
        letter: state.ui.served.letter,
        questionId: state.ui.served.question.id,
      };
      const log1 = [...state.log, skip];
      const g1 = replay(log1);
      const { question, letter, repeated } = chooseQuestion(state.opts, g1, cell);
      const serve: GameEvent = { type: 'QuestionServed', cell, letter, questionId: question.id };
      const log2 = [...log1, serve];
      return {
        ...state,
        log: log2,
        game: replay(log2),
        ui: {
          // NOTE: selectedCell + pulse are unchanged, so the Timer keeps running
          // across a skip (it does not reset — user request).
          ...state.ui,
          served: { question, letter, cell },
          answerRevealed: false,
          skipsUsed: state.ui.skipsUsed + 1,
          repeated,
        },
      };
    }

    // Auto-advance past an UNREACHABLE media clip (audio/video/trailer/image) — the
    // card detects the load error and dispatches this so play continues on its own,
    // WITHOUT spending the host's manual skip. Capped so a fully-broken pack can't
    // loop forever (after the cap it stops and the manual fallback card stays).
    case 'AUTO_SKIP': {
      if (!state.opts || !state.ui.served) return state;
      if (state.ui.autoSkips >= 12) return state; // loop guard
      const cell = state.ui.served.cell;
      const skip: GameEvent = {
        type: 'QuestionSkipped',
        letter: state.ui.served.letter,
        questionId: state.ui.served.question.id,
      };
      const log1 = [...state.log, skip];
      const g1 = replay(log1);
      const { question, letter, repeated } = chooseQuestion(state.opts, g1, cell);
      const serve: GameEvent = { type: 'QuestionServed', cell, letter, questionId: question.id };
      const log2 = [...log1, serve];
      return {
        ...state,
        log: log2,
        game: replay(log2),
        ui: {
          ...state.ui, // selectedCell + pulse unchanged → timer keeps running
          served: { question, letter, cell },
          answerRevealed: false,
          autoSkips: state.ui.autoSkips + 1,
          repeated,
        },
      };
    }

    case 'ADJUDICATE': {
      if (state.ui.phase !== 'question' || state.ui.selectedCell === null) return state;
      const cell = state.ui.selectedCell;
      if (action.team) {
        const stolen = action.team !== state.game.turn;
        return applyAndAdvance(state, [
          { type: 'HexClaimed', cell, team: action.team, stolen },
        ]);
      }
      return applyAndAdvance(state, [{ type: 'TurnPassed' }]);
    }

    case 'PIE_SWAP': {
      if (!canPieSwap(state.game)) return state;
      return applyAndAdvance(state, [{ type: 'PieSwapped' }]);
    }

    case 'SWITCH_TURN': {
      // Manual host intervention: flip whose turn it is (only between picks).
      if (state.game.status !== 'playing' || state.ui.phase !== 'pick') return state;
      return applyAndAdvance(state, [{ type: 'TurnPassed' }]);
    }

    case 'UNDO': {
      const { log, state: game } = undoLast(state.log);
      // "Half-question" undo: if the move we just reverted was an adjudication
      // (so the now-last event is the QuestionServed it resolved), restore the
      // question view and re-show the SAME question — the host can re-judge it
      // without burning a new question. Any other undo returns to the pick phase.
      const last = log[log.length - 1];
      if (last && last.type === 'QuestionServed' && state.opts) {
        const q = allQuestions(state.opts.pack as QuestionPack).find((x) => x.id === last.questionId);
        if (q) {
          return {
            ...state,
            log,
            game,
            ui: {
              ...EMPTY_UI,
              phase: 'question',
              selectedCell: last.cell,
              served: { question: q, letter: last.letter, cell: last.cell },
              pulse: state.ui.pulse + 1,
            },
          };
        }
      }
      return { ...state, log, game, ui: { ...EMPTY_UI, pulse: state.ui.pulse + 1 } };
    }

    case 'CONTINUE_AFTER_GAME': {
      if (!state.opts || !state.ui.gameOver) return state;
      const winner = state.game.winner;
      const series = { ...state.series };
      if (winner) series[winner] += 1;
      series.gamesPlayed += 1;
      if (winner && series[winner] >= series.gamesNeeded) {
        series.matchWinner = winner;
        return { ...state, series, screen: 'victory' };
      }
      const log: GameLog = [startGameEvent(state.opts, series.gamesPlayed)];
      return {
        ...state,
        series,
        log,
        game: replay(log),
        ui: { ...EMPTY_UI },
      };
    }

    case 'REMATCH': {
      if (!state.opts) return state;
      const seed = (Date.now() >>> 0) ^ 0x27d4eb2f;
      const opts = { ...state.opts, seed };
      const log: GameLog = [startGameEvent(opts, 0)];
      return {
        ...state,
        screen: 'game',
        opts,
        series: { A: 0, B: 0, gamesPlayed: 0, matchWinner: null, gamesNeeded: state.series.gamesNeeded },
        log,
        game: replay(log),
        ui: { ...EMPTY_UI },
      };
    }

    case 'EXIT_HOME':
      return { ...state, screen: 'home', online: false };

    case 'HYDRATE':
      return { ...state, ...action.payload };
  }
}

const initialState: StoreState = {
  screen: 'home',
  settings: DEFAULT_SETTINGS,
  setup: DEFAULT_SETUP,
  opts: null,
  series: { A: 0, B: 0, gamesPlayed: 0, matchWinner: null, gamesNeeded: 1 },
  log: [],
  game: PLACEHOLDER_GAME,
  ui: { ...EMPTY_UI },
  online: false,
};

interface StoreApi {
  state: StoreState;
  dispatch: React.Dispatch<Action>;
  canPieSwap: boolean;
  hasSavedGame: boolean;
}

const StoreContext = createContext<StoreApi | null>(null);

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (s) => ({
    ...s,
    settings: loadSettings(),
  }));

  // Record served questions into the cross-game no-repeat tracker (plan §8).
  // We only mark NEW serves since the last commit (ref-tracked) so the cycle
  // counter advances exactly once per question and undo/new-game shrink resets it.
  const markRef = useRef(0);
  useEffect(() => {
    if (!state.opts) {
      markRef.current = 0;
      return;
    }
    const pack = state.opts.pack as QuestionPack;
    const servedIds = state.log
      .filter((e): e is Extract<GameEvent, { type: 'QuestionServed' }> => e.type === 'QuestionServed')
      .map((e) => e.questionId);
    if (servedIds.length < markRef.current) markRef.current = servedIds.length; // undo / new game
    if (servedIds.length > markRef.current) {
      markServed(pack.id, servedIds.slice(markRef.current), allQuestionIds(pack));
      markRef.current = servedIds.length;
    }
  }, [state.log, state.opts]);

  // Apply accessibility settings to <html> so CSS + reduced-motion react globally.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.font = state.settings.font;
    root.dataset.textscale = state.settings.textScale === 'normal' ? '' : state.settings.textScale;
    root.dataset.motion = state.settings.motion;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {
      /* ignore */
    }
  }, [state.settings]);

  // Persist the live match for save/resume (plan §6.2). For signed-in users this
  // also write-throughs to their account (Supabase) so they can resume on any
  // device; guests keep a local-only save. See state/savedGame.ts.
  useEffect(() => {
    if (state.opts && state.screen === 'game') {
      saveGame({ setup: state.setup, opts: serializeOpts(state.opts), series: state.series, log: state.log });
    }
  }, [state.opts, state.log, state.series, state.screen, state.setup]);

  // hasSavedGame is reactive: the savedGame module notifies after async remote
  // hydration on sign-in, so the Resume button appears once the account's save
  // loads — not only on the next render.
  const hasSavedGame = useSyncExternalStore(
    subscribeSavedGame,
    hasSavedGameModule,
    () => false,
  );

  const value = useMemo<StoreApi>(
    () => ({
      state,
      dispatch,
      canPieSwap: canPieSwap(state.game),
      hasSavedGame,
    }),
    [state, hasSavedGame],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function serializeOpts(opts: NewMatchOptions) {
  return { ...opts, packId: (opts.pack as QuestionPack).id };
}

export function resumeSavedGame(dispatch: React.Dispatch<Action>): boolean {
  try {
    const data = getSavedGame();
    if (!data) return false;
    const pack = packById(data.opts.packId ?? DEFAULT_PACK_ID);
    const opts: NewMatchOptions = { ...(data.opts as object), pack } as NewMatchOptions;
    const log = data.log as GameLog;
    const game = replay(log);
    dispatch({
      type: 'HYDRATE',
      payload: {
        screen: 'game',
        opts,
        series: data.series as Series,
        log,
        game,
        ui: { ...EMPTY_UI },
        ...(data.setup ? { setup: data.setup as SetupForm } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export function clearSavedGame() {
  clearSave();
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
