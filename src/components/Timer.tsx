import { useEffect, useRef, useState } from 'react';
import { play } from '../services/audio';

/**
 * Optional countdown (plan §3.1). Purely an aid — the host always decides the
 * outcome. Resets whenever `resetKey` changes (i.e. a new question is served).
 */
export function Timer({ seconds, resetKey, active }: { seconds: number; resetKey: string; active: boolean }) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef<number>(0);
  const raf = useRef<number>(0);
  const tickedRef = useRef(false);

  useEffect(() => {
    if (seconds === 0 || !active) return;
    setRemaining(seconds);
    tickedRef.current = false;
    startRef.current = performance.now();
    const loop = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 5 && !tickedRef.current && left > 0) {
        // soft urgency ticks in the last 5s
      }
      if (left <= 5.01 && left > 0) {
        const whole = Math.ceil(left);
        if (whole !== tickRef.current) {
          tickRef.current = whole;
          play('tick');
        }
      }
      if (left <= 0) {
        if (!tickedRef.current) {
          tickedRef.current = true;
          play('wrong');
        }
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds, active]);

  const tickRef = useRef<number>(0);

  if (seconds === 0) return null;
  const pct = Math.max(0, Math.min(1, remaining / seconds));
  const urgent = remaining <= 5 && remaining > 0;
  const done = remaining <= 0;

  return (
    <div className={`timer ${urgent ? 'urgent' : ''} ${done ? 'done' : ''}`} data-testid="timer">
      <div className="timer-bar">
        <div className="timer-fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <span className="timer-num">{done ? "Time!" : `${Math.ceil(remaining)}s`}</span>
    </div>
  );
}
