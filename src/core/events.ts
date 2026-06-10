import type { Direction, TeamId } from './models';
import type { TopologyKind } from './topology';

/**
 * Append-only move log (plan §6.2). Every state change is one of these events.
 * Undo = truncate the log + replay. Save/resume = persist the log. Phase-2
 * multiplayer = the server broadcasts the exact same events.
 *
 * Events are at "host-action" granularity so the log maps 1:1 to the host pad and
 * each entry is independently replayable.
 */
export type GameEvent =
  | {
      type: 'GameStarted';
      size: number;
      topology: TopologyKind;
      letters: string[];
      directions: Record<TeamId, Direction>;
      firstPicker: TeamId;
      pieRuleEnabled: boolean;
    }
  // A question was served onto a hex (records it as used so it won't repeat).
  | { type: 'QuestionServed'; cell: number; letter: string; questionId: string }
  // Host skipped a question and served a fresh one.
  | { type: 'QuestionSkipped'; letter: string; questionId: string }
  // A team (the picker OR the stealer) answered correctly and claimed the hex.
  | { type: 'HexClaimed'; cell: number; team: TeamId; stolen: boolean }
  // Nobody answered — the picked hex stays neutral and the turn passes.
  | { type: 'TurnPassed' }
  // Team B uses the pie rule: take over A's opening hex; turn returns to A.
  | { type: 'PieSwapped' };

export type GameLog = GameEvent[];
