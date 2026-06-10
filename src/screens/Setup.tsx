import { packById } from '../content';
import type { BoardSize, MatchMode } from '../core/models';
import { play } from '../services/audio';
import { TEAM_COLORS } from '../state/palette';
import { useStore } from '../state/store';
import type { SetupForm } from '../state/types';

function OptionRow<T extends string | number>({
  label,
  hint,
  options,
  value,
  onChange,
  testId,
}: {
  label: string;
  hint?: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  testId?: string;
}) {
  return (
    <div className="setup-row">
      <div className="setup-label">
        {label}
        {hint && <span className="setup-hint">{hint}</span>}
      </div>
      <div className="choice-grid" data-testid={testId}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            className={`choice ${value === o.value ? 'active' : ''}`}
            data-testid={testId ? `${testId}-${o.value}` : undefined}
            onClick={() => {
              play('tap');
              onChange(o.value);
            }}
          >
            <span className="choice-label">{o.label}</span>
            {o.sub && <span className="choice-sub">{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Setup() {
  const { state, dispatch } = useStore();
  const f = state.setup;
  const set = (patch: Partial<SetupForm>) => dispatch({ type: 'UPDATE_SETUP', patch });
  const pack = packById(f.packId);

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
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}>
          ‹ Back
        </button>
        <h1>Match setup</h1>
        <div className="pack-pill">
          <span>{pack.emoji}</span> {pack.name}
        </div>
      </header>

      <div className="setup-body">
        <div className="teams-setup">
          <div className="team-field team-a">
            <input
              className="team-name-input"
              data-testid="team-a-name"
              value={f.teamA}
              maxLength={16}
              onChange={(e) => set({ teamA: e.target.value })}
              placeholder="Team 1"
              aria-label="Team 1 name (optional)"
            />
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
            <input
              className="team-name-input"
              data-testid="team-b-name"
              value={f.teamB}
              maxLength={16}
              onChange={(e) => set({ teamB: e.target.value })}
              placeholder="Team 2"
              aria-label="Team 2 name (optional)"
            />
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
      </div>

      <button
        className="btn btn-primary btn-lg block start-btn"
        data-testid="start-match"
        onClick={() => {
          play('pick');
          dispatch({ type: 'START_MATCH' });
        }}
      >
        Start match ▸
      </button>
    </div>
  );
}
