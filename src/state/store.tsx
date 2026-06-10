import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { canPieSwap, replay, undoLast } from '../core/engine';
import type { GameEvent, GameLog } from '../core/events';
import { gamesNeededFor, type GameState, type TeamConfig, type TeamId } from '../core/models';
import { serveQuestion, type QuestionPack } from '../core/packs';
import { mulberry32 } from '../core/rng';
import { newMatch, startGameEvent, type NewMatchOptions } from '../core/match';
import { DEFAULT_PACK_ID, packById } from '../content';
import { colorById } from './palette';
import {
  DEFAULT_SETTINGS,
  type Screen,
  type Settings,
  type SetupForm,
  type UiState,
} from './types';

const PERSIST_KEY = 'letterlock.save.v1';
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
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings> }
  | { type: 'UPDATE_SETUP'; patch: Partial<SetupForm> }
  | { type: 'START_MATCH' }
  | { type: 'PICK_CELL'; cell: number }
  | { type: 'REVEAL_ANSWER' }
  | { type: 'SKIP_QUESTION' }
  | { type: 'ADJUDICATE'; team: TeamId | null }
  | { type: 'PIE_SWAP' }
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

function serveFor(opts: NewMatchOptions, game: GameState, cell: number): {
  question: ReturnType<typeof serveQuestion>['question'];
  letter: string;
} {
  const letter = game.letters[cell];
  const rng = mulberry32((opts.seed + cell * 131 + game.moveCount * 977) >>> 0);
  const served = serveQuestion(opts.pack as QuestionPack, letter, game.usedQuestions[letter] ?? [], rng);
  return { question: served.question, letter: served.letter };
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
      const { question, letter } = serveFor(state.opts, state.game, action.cell);
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
        },
      };
    }

    case 'REVEAL_ANSWER':
      return { ...state, ui: { ...state.ui, answerRevealed: true } };

    case 'SKIP_QUESTION': {
      if (!state.opts || !state.ui.served) return state;
      const cell = state.ui.served.cell;
      const skip: GameEvent = {
        type: 'QuestionSkipped',
        letter: state.ui.served.letter,
        questionId: state.ui.served.question.id,
      };
      const log1 = [...state.log, skip];
      const g1 = replay(log1);
      const { question, letter } = serveFor(state.opts, g1, cell);
      const serve: GameEvent = { type: 'QuestionServed', cell, letter, questionId: question.id };
      const log2 = [...log1, serve];
      return {
        ...state,
        log: log2,
        game: replay(log2),
        ui: {
          ...state.ui,
          served: { question, letter, cell },
          answerRevealed: false,
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

    case 'UNDO': {
      const { log, state: game } = undoLast(state.log);
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
      return { ...state, screen: 'home' };

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

  // Persist the live match for save/resume (plan §6.2).
  useEffect(() => {
    try {
      if (state.opts && state.screen === 'game') {
        localStorage.setItem(
          PERSIST_KEY,
          JSON.stringify({ setup: state.setup, opts: serializeOpts(state.opts), series: state.series, log: state.log }),
        );
      } else if (state.screen === 'home') {
        // keep the save until a new match starts; nothing to do
      }
    } catch {
      /* ignore */
    }
  }, [state.opts, state.log, state.series, state.screen, state.setup]);

  const value = useMemo<StoreApi>(
    () => ({
      state,
      dispatch,
      canPieSwap: canPieSwap(state.game),
      hasSavedGame: typeof localStorage !== 'undefined' && !!localStorage.getItem(PERSIST_KEY),
    }),
    [state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function serializeOpts(opts: NewMatchOptions) {
  return { ...opts, packId: (opts.pack as QuestionPack).id };
}

export function resumeSavedGame(dispatch: React.Dispatch<Action>): boolean {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const pack = packById(data.opts.packId ?? DEFAULT_PACK_ID);
    const opts: NewMatchOptions = { ...data.opts, pack };
    const log: GameLog = data.log;
    const game = replay(log);
    dispatch({
      type: 'HYDRATE',
      payload: {
        screen: 'game',
        opts,
        series: data.series,
        log,
        game,
        ui: { ...EMPTY_UI },
        ...(data.setup ? { setup: data.setup } : {}),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
