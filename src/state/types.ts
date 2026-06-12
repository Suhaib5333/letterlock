import type { BoardSize, MatchMode } from '../core/models';
import type { Question } from '../core/packs';
import type { TopologyKind } from '../core/topology';

export type Screen = 'home' | 'setup' | 'game' | 'victory' | 'tutorial';

export interface Settings {
  sound: boolean;
  music: boolean;
  motion: 'full' | 'reduced';
  font: 'default' | 'hyperlegible' | 'lexend';
  textScale: 'normal' | 'large' | 'xlarge';
  tts: boolean;
  adjudicationStyle: 'structured' | 'hostcall';
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false, // default music OFF for classroom contexts (plan §7.4)
  motion: 'full',
  font: 'default',
  textScale: 'normal',
  tts: false,
  adjudicationStyle: 'structured',
};

export interface SetupForm {
  colorA: string; // palette color id (also the team's name)
  colorB: string;
  mode: MatchMode;
  size: BoardSize;
  topology: TopologyKind;
  pieRule: boolean;
  timer: 0 | 20 | 30 | 45; // seconds; 0 = no timer (relaxed/classroom)
  packId: string;
}

export interface Served {
  question: Question;
  letter: string;
  cell: number;
}

export interface UiState {
  phase: 'pick' | 'question';
  selectedCell: number | null;
  served: Served | null;
  answerRevealed: boolean;
  gameOver: boolean; // a game just ended; show the result overlay
  lastClaimCell: number | null; // drives the claim animation
  blockHint: boolean; // a recent claim cut the opponent's near-complete path
  pulse: number; // monotonically increasing tick to retrigger effects
  skipsUsed: number; // skips taken on the current pick (max 1 — plan §3.2)
  autoSkips: number; // questions auto-advanced past on this pick (unreachable media)
  repeated: boolean; // the served question is a forced repeat (whole pack cycled)
}
