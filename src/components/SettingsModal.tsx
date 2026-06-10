import { motion } from 'motion/react';
import { play } from '../services/audio';
import { useStore } from '../state/store';
import type { Settings } from '../state/types';

function Toggle({
  label,
  hint,
  value,
  onChange,
  testId,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="set-row">
      <div>
        <div className="set-label">{label}</div>
        {hint && <div className="set-hint">{hint}</div>}
      </div>
      <button
        className={`switch ${value ? 'on' : ''}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
        data-testid={testId}
        onClick={() => {
          play('tap');
          onChange(!value);
        }}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

function Segment<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="set-row">
      <div className="set-label">{label}</div>
      <div className="segment">
        {options.map((o) => (
          <button
            key={o.value}
            className={value === o.value ? 'active' : ''}
            onClick={() => {
              play('tap');
              onChange(o.value);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const set = (patch: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', patch });

  return (
    <div className="modal-scrim" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        role="dialog"
        aria-label="Settings"
      >
        <header className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" aria-label="Close settings" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="set-group">
          <h3>Audio</h3>
          <Toggle label="Sound effects" value={s.sound} onChange={(v) => set({ sound: v })} testId="set-sound" />
          <Toggle label="Music" hint="Off by default for classrooms" value={s.music} onChange={(v) => set({ music: v })} />
        </div>

        <div className="set-group">
          <h3>Accessibility</h3>
          <Segment
            label="Motion"
            value={s.motion}
            onChange={(v) => set({ motion: v })}
            options={[
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
          <Segment
            label="Font"
            value={s.font}
            onChange={(v) => set({ font: v })}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'hyperlegible', label: 'Hyperlegible' },
              { value: 'lexend', label: 'Lexend' },
            ]}
          />
          <Segment
            label="Text size"
            value={s.textScale}
            onChange={(v) => set({ textScale: v })}
            options={[
              { value: 'normal', label: 'A' },
              { value: 'large', label: 'A+' },
              { value: 'xlarge', label: 'A++' },
            ]}
          />
          <Toggle
            label="Read questions aloud"
            hint="Text-to-speech for each question"
            value={s.tts}
            onChange={(v) => set({ tts: v })}
          />
        </div>

        <div className="set-group">
          <h3>Gameplay</h3>
          <Segment
            label="Adjudication"
            value={s.adjudicationStyle}
            onChange={(v) => set({ adjudicationStyle: v })}
            options={[
              { value: 'structured', label: 'Structured' },
              { value: 'hostcall', label: 'Host-call' },
            ]}
          />
        </div>

        <button className="btn btn-primary block" onClick={onClose}>
          Done
        </button>
      </motion.div>
    </div>
  );
}
