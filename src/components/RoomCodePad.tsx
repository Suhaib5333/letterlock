import { useEffect, useRef } from 'react';
import { play } from '../services/audio';

/**
 * On-screen room-code pad for TV remotes (LAUNCH_PLAN.md Phase 3b). The keys are
 * exactly the room-code alphabet (lib/lobby.ts CODE_ALPHABET: no I, L, O, 0, 1),
 * plus Backspace and Join. Shown in LobbyJoin only under html.tv-mode, next to
 * the regular input (which still works through the system keyboard). When the
 * sixth character lands, focus moves to the Join key so Enter joins at once.
 */
const KEYS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split('');
export const CODE_LENGTH = 6;

interface Props {
  value: string;
  onChange: (code: string) => void;
  onJoin: () => void;
  canJoin: boolean;
}

export function RoomCodePad({ value, onChange, onJoin, canJoin }: Props) {
  const joinRef = useRef<HTMLButtonElement>(null);
  const full = value.length >= CODE_LENGTH;

  useEffect(() => {
    if (full && canJoin) joinRef.current?.focus();
  }, [full, canJoin]);

  return (
    <div className="room-pad" data-testid="room-pad" role="group" aria-label="Room code keys">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className="pad-key"
          data-testid={`pad-key-${k}`}
          disabled={full}
          onClick={() => {
            play('tap');
            onChange((value + k).slice(0, CODE_LENGTH));
          }}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        className="pad-key pad-wide"
        data-testid="pad-backspace"
        aria-label="Delete last character"
        disabled={value.length === 0}
        onClick={() => {
          play('tap');
          onChange(value.slice(0, -1));
        }}
      >
        ⌫
      </button>
      <button
        ref={joinRef}
        type="button"
        className="pad-key pad-wide pad-join"
        data-testid="pad-join"
        disabled={!canJoin}
        onClick={onJoin}
      >
        Join ▸
      </button>
    </div>
  );
}
