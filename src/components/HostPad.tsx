import type { TeamConfig, TeamId } from '../core/models';

interface Props {
  teams: Record<TeamId, TeamConfig>;
  picker: TeamId;
  canSteal: boolean; // structured rule: only the non-picker can steal after a miss
  answerRevealed: boolean;
  canUndo: boolean;
  onAward: (team: TeamId) => void;
  onNoOne: () => void;
  onUndo: () => void;
}

/**
 * Host adjudication pad (plan §3.2). Always exposes ✅A / ✅B / ⬜None / ↩Undo.
 * The picking team is emphasised; in structured mode the opponent button reads
 * "steal".
 */
export function HostPad({
  teams,
  picker,
  canSteal,
  canUndo,
  onAward,
  onNoOne,
  onUndo,
}: Props) {
  const other: TeamId = picker === 'A' ? 'B' : 'A';
  return (
    <div className="hostpad" data-testid="host-pad">
      <button
        className={`award team-${picker} primary`}
        data-testid={`award-${picker}`}
        onClick={() => onAward(picker)}
      >
        ✅ {teams[picker].name}
        <span className="award-sub">claims it</span>
      </button>

      <button
        className={`award team-${other} ${canSteal ? '' : 'subtle'}`}
        data-testid={`award-${other}`}
        onClick={() => onAward(other)}
      >
        ✅ {teams[other].name}
        <span className="award-sub">{canSteal ? 'steals it' : 'claims it'}</span>
      </button>

      <button className="award none" data-testid="award-none" onClick={onNoOne}>
        ⬜ No one
        <span className="award-sub">stays neutral</span>
      </button>

      <button className="award undo" data-testid="undo" disabled={!canUndo} onClick={onUndo}>
        ↩ Undo
      </button>
    </div>
  );
}
