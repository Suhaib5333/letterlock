import { useEffect, useRef, useState } from 'react';
import { play } from '../services/audio';

type Phase = 'main' | 'steal' | 'done';

/**
 * Two-phase countdown (plan §3.2 + steal rule). The picking team gets the full
 * time; when it runs out the OTHER team automatically gets HALF the time to steal.
 * Purely an advisory aid — the host always decides the outcome. Resets whenever
 * `resetKey` changes (a new question is served).
 */
export function Timer({
  seconds,
  resetKey,
  active,
  pickerName,
  otherName,
}: {
  seconds: number;
  resetKey: string;
  active: boolean;
  pickerName: string;
  otherName: string;
}) {
  const [phase, setPhase] = useState<Phase>('main');
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(0);
  const raf = useRef(0);
  const phaseRef = useRef<Phase>('main');
  const tickRef = useRef(0);

  useEffect(() => {
    if (seconds === 0 || !active) return;
    phaseRef.current = 'main';
    setPhase('main');
    setRemaining(seconds);
    tickRef.current = 0;
    startRef.current = performance.now();

    const durationOf = () => (phaseRef.current === 'steal' ? seconds / 2 : seconds);
    const loop = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const left = Math.max(0, durationOf() - elapsed);
      setRemaining(left);
      if (left <= 5 && left > 0) {
        const whole = Math.ceil(left);
        if (whole !== tickRef.current) {
          tickRef.current = whole;
          play('tick');
        }
      }
      if (left <= 0) {
        if (phaseRef.current === 'main') {
          // hand the other team half the time to steal
          phaseRef.current = 'steal';
          setPhase('steal');
          startRef.current = now;
          tickRef.current = 0;
          play('steal');
          raf.current = requestAnimationFrame(loop);
          return;
        }
        phaseRef.current = 'done';
        setPhase('done');
        play('wrong');
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds, active]);

  if (seconds === 0) return null;
  const total = phase === 'steal' ? seconds / 2 : seconds;
  const pct = Math.max(0, Math.min(1, remaining / total));
  const urgent = phase === 'steal' || (remaining <= 5 && remaining > 0);
  const done = phase === 'done';

  const label =
    phase === 'done'
      ? 'Time!'
      : phase === 'steal'
        ? `⚡ ${otherName} steal`
        : pickerName;

  return (
    <div
      className={`timer ${urgent ? 'urgent' : ''} ${done ? 'done' : ''} ${phase === 'steal' ? 'steal' : ''}`}
      data-testid="timer"
      data-phase={phase}
    >
      <span className="timer-label">{label}</span>
      <div className="timer-bar">
        <div className="timer-fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <span className="timer-num">{done ? '0s' : `${Math.ceil(remaining)}s`}</span>
    </div>
  );
}
