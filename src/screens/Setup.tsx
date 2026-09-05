import { useEffect } from 'react';
import { packById } from '../content';
import type { BoardSize, MatchMode } from '../core/models';
import {
  boardSizeUnlocked,
  boardUnlockLevel,
  modeUnlocked,
  modeUnlockLevel,
} from '../core/progression';
import { useAppConfig } from '../lib/appConfig';
import { useAuth } from '../lib/auth';
import { useOnlineRooms } from '../lib/online';
import { accessFromProfile } from '../lib/progressionClient';
import { play } from '../services/audio';
import { colorById, TEAM_COLORS } from '../state/palette';
import { useStore } from '../state/store';
import type { SetupForm } from '../state/types';

function OptionRow<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  testId,
  lockLevelFor,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
  /** Returns the level an option unlocks at, or null if it's unlocked. */
  lockLevelFor?: (v: T) => number | null;
}) {
  return (
    <div className="setup-row">
      <div className="setup-label">
        {label}
        {hint && <span className="setup-hint">{hint}</span>}
      </div>
      <div className="choice-grid" data-testid={testId}>
        {options.map((o) => {
          const lockLevel = lockLevelFor?.(o.value) ?? null;
          const locked = lockLevel !== null;
          return (
            <button
              key={String(o.value)}
              className={`choice ${value === o.value ? 'active' : ''} ${locked ? 'locked' : ''}`}
              data-testid={testId ? `${testId}-${o.value}` : undefined}
              disabled={locked}
              aria-disabled={locked}
              title={locked ? `Unlocks at Level ${lockLevel}` : undefined}
              onClick={() => {
                if (locked) return;
                play('tap');
                onChange(o.value);
              }}
            >
              <span className="choice-label">
                {locked && <span aria-hidden="true">🔒 </span>}
                {o.label}
              </span>
              <span className="choice-sub">{locked ? `Lv ${lockLevel}` : o.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Setup() {
  const { state, dispatch } = useStore();
  const { profile } = useAuth();
  const access = accessFromProfile(profile);
  const f = state.setup;
  const online = state.online;
  const playMode = state.playMode;
  const isParty = playMode === 'party';
  const rooms = useOnlineRooms(useAppConfig());
  const set = (patch: Partial<SetupForm>) => dispatch({ type: 'UPDATE_SETUP', patch });
  const pack = packById(f.packId);

  // Clamp the selection to what's unlocked (e.g. a guest defaulting to 5×5 must
  // drop to 4×4; bo5 → bo3) so a locked option is never the active one.
  useEffect(() => {
    if (!boardSizeUnlocked(f.size, access) && f.size !== 4) set({ size: 4 });
    if (!modeUnlocked(f.mode, access) && f.mode !== 'bo3') set({ mode: 'bo3' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.level, access.prestige, access.fullAccess]);

  // Pick a color for a team; if it collides with the other team, swap them so the
  // two teams are always distinct.
  const pickColor = (team: 'A' | 'B', id: string) => {
    play('tap');
    if (team === 'A') {
      set(id === f.colorB ? { colorA: id, colorB: f.colorA } : { colorA: id });
    } else {
      set(id === f.colorA ? { colorB: id, colorA: f.colorB } : { colorB: id });
    }
  };

  return (
    <div className="setup">
      <header className="sub-head">
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'mode-select' })}>
          ‹ Back
        </button>
        <div className="sub-head-title">
          <h1>Match setup</h1>
          {/* Couch = in-person single-screen; Online = Kahoot-style with phones
              as buzzers. Online does setup FIRST, then mints the room code. */}
          <span className="mode-badge" data-testid="mode-badge">
            {online ? '🛜 Party Mode' : '🛋 Couch Mode'}
          </span>
        </div>
        <div className="pack-pill">
          <span>{pack.emoji}</span> {pack.name}
        </div>
      </header>

      <div className="setup-body">
        <div className="teams-setup">
          <div className="team-field team-a">
            <div className="team-name" data-testid="team-a-name">
              {colorById(f.colorA).name}
            </div>
            <div className="swatches" data-testid="swatches-a">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${f.colorA === c.id ? 'active' : ''}`}
                  data-testid={`swatch-a-${c.id}`}
                  style={{ background: c.base }}
                  aria-label={`Team 1 color ${c.name}`}
                  aria-pressed={f.colorA === c.id}
                  onClick={() => pickColor('A', c.id)}
                />
              ))}
            </div>
          </div>
          <div className="vs">VS</div>
          <div className="team-field team-b">
            <div className="team-name" data-testid="team-b-name">
              {colorById(f.colorB).name}
            </div>
            <div className="swatches" data-testid="swatches-b">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${f.colorB === c.id ? 'active' : ''}`}
                  data-testid={`swatch-b-${c.id}`}
                  style={{ background: c.base }}
                  aria-label={`Team 2 color ${c.name}`}
                  aria-pressed={f.colorB === c.id}
                  onClick={() => pickColor('B', c.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <OptionRow<MatchMode>
          label="Match length"
          options={[
            { value: 'single', label: 'Single', sub: '1 game' },
            { value: 'bo3', label: 'Best of 3', sub: 'first to 2' },
            { value: 'bo5', label: 'Best of 5', sub: 'first to 3' },
          ]}
          value={f.mode}
          onChange={(v) => set({ mode: v })}
          testId="mode"
          lockLevelFor={(v) => (modeUnlocked(v, access) ? null : modeUnlockLevel(v))}
        />

        <OptionRow<BoardSize>
          label="Board size"
          options={[
            { value: 4, label: '4 × 4', sub: 'Quick' },
            { value: 5, label: '5 × 5', sub: 'Classic' },
            { value: 7, label: '7 × 7', sub: 'Epic' },
          ]}
          value={f.size}
          onChange={(v) => set({ size: v })}
          testId="size"
          lockLevelFor={(v) => (boardSizeUnlocked(v, access) ? null : boardUnlockLevel(v))}
        />

        <OptionRow<SetupForm['timer']>
          label="Answer timer"
          hint="Relaxed has no timer — ideal for classrooms"
          options={[
            { value: 0, label: 'Relaxed', sub: 'no timer' },
            { value: 45, label: '45s' },
            { value: 30, label: '30s' },
            { value: 20, label: '20s' },
          ]}
          value={f.timer}
          onChange={(v) => set({ timer: v })}
          testId="timer"
        />

        <div className="setup-row">
          <div className="setup-label">
            Pie rule
            <span className="setup-hint">Team 2 may swap after move 1 — neutralises first-move advantage</span>
          </div>
          <button
            className={`switch ${f.pieRule ? 'on' : ''}`}
            role="switch"
            aria-checked={f.pieRule}
            data-testid="pie-toggle"
            onClick={() => {
              play('tap');
              set({ pieRule: !f.pieRule });
            }}
          >
            <span className="knob" />
          </button>
        </div>

        {/* Couch Mode: choose which team the HOST plays on (so the host earns
            that team's XP) — or "Just hosting" to run the game without scoring.
            Party Mode hides this (the host is the arbiter and never earns XP). */}
        {!isParty && (
          <OptionRow<'A' | 'B' | 'none'>
            label="You're playing as"
            hint="Earn XP for this team — or just host without scoring"
            options={[
              { value: 'A', label: colorById(f.colorA).name, sub: 'earn its XP' },
              { value: 'B', label: colorById(f.colorB).name, sub: 'earn its XP' },
              { value: 'none', label: '👀 Just hosting', sub: 'no XP' },
            ]}
            value={f.hostTeam ?? 'none'}
            onChange={(v) => set({ hostTeam: v === 'none' ? null : v })}
            testId="host-team"
          />
        )}
      </div>

      <div className="setup-actions">
        <button
          className="btn btn-primary btn-lg block start-btn"
          data-testid="start-match"
          disabled={isParty && !rooms.ok}
          title={isParty && !rooms.ok ? 'Online rooms are paused while offline' : undefined}
          onClick={() => {
            play('pick');
            // Party: go to the lobby to share the code (match starts from there).
            // Couch: start the match immediately on this one screen.
            if (isParty) {
              dispatch({ type: 'SET_SCREEN', screen: 'lobby-host' });
            } else {
              dispatch({ type: 'START_MATCH' });
            }
          }}
        >
          {isParty ? 'Create room ▸' : 'Start match ▸'}
        </button>

        {/* Couch Mode only: optionally open a room so friends can scan a QR and
            link their account — they earn XP for their team's results without
            answering on their phones (the host still adjudicates on this screen). */}
        {!isParty && (
          <button
            className="btn btn-secondary btn-lg block invite-btn"
            data-testid="couch-invite"
            onClick={() => {
              play('pick');
              dispatch({ type: 'SET_ONLINE', value: true }); // open a lobby (stays Couch)
              dispatch({ type: 'SET_SCREEN', screen: 'lobby-host' });
            }}
          >
            📱 Invite players for XP ▸
          </button>
        )}
      </div>
    </div>
  );
}
