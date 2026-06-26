import { useEffect, useRef, useState } from 'react';
import { colorById } from '../state/palette';
import { play } from '../services/audio';

type Phase = 'main' | 'steal' | 'done';

/**
 * Two-phase countdown (plan §3.2 + steal rule). The picking team gets the full
 * time; when it runs out the OTHER team automatically gets HALF the time to
 * answer. Purely an advisory aid — the host decides the outcome (Couch Mode) or
 * the auto-reveal flow takes over (Party Mode). Resets whenever `resetKey`
 * changes (a new question is served).
 *
 * The bar + labels are tinted with the **colour of whichever team's window is
 * live** (the picker in the main phase, the other team in the steal phase) so a
 * glance tells you whose clock is running.
 *
 * `endPhaseSignal` lets the host end the current phase EARLY (Party Mode): bump
 * it when a team locks in their answer and the countdown jumps straight to the
 * next phase (their time effectively goes to 0 and the other team's clock starts,
 * then "Time!").
 */
export function Timer({
  seconds,
  resetKey,
  active,
  pickerName,
  otherName,
  pickerColorId,
  otherColorId,
  endPhaseSignal = 0,
  onPhase,
}: {
  seconds: number;
  resetKey: string;
  active: boolean;
  pickerName: string;
  otherName: string;
  /** Colour ids of the two teams — used to tint the bar by whose window is live. */
  pickerColorId?: string;
  otherColorId?: string;
  /** Increment to end the CURRENT phase immediately (a team locked their answer). */
  endPhaseSignal?: number;
  /** Fires when the countdown transitions to the steal phase / finishes — lets
   *  Party Mode open the next team's window / trigger the winner reveal. */
  onPhase?: (phase: 'steal' | 'done') => void;
}) {
  const [phase, setPhase] = useState<Phase>('main');
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(0);
  const phaseRef = useRef<Phase>('main');
  const tickRef = useRef(0);
  // Track the early-end signal so the rAF loop can consume a fresh bump.
  const endSignalRef = useRef(endPhaseSignal);
  endSignalRef.current = endPhaseSignal;
  const handledSignalRef = useRef(endPhaseSignal);

  useEffect(() => {
    if (seconds === 0 || !active) return;
    // `cancelled` + a loop-local rafId are scoped to THIS effect run, so React
    // StrictMode's double-invoke (and any rapid resetKey change) can never leave
    // a second countdown loop running — exactly one loop is ever live.
    let cancelled = false;
    let rafId = 0;
    phaseRef.current = 'main';
    setPhase('main');
    setRemaining(seconds);
    tickRef.current = 0;
    startRef.current = performance.now();
    // A new question/phase-window: ignore any pending early-end bump from the
    // previous question so it can't instantly skip this fresh countdown.
    handledSignalRef.current = endSignalRef.current;

    const durationOf = () => (phaseRef.current === 'steal' ? seconds / 2 : seconds);
    const loop = (now: number) => {
      if (cancelled) return;
      const elapsed = (now - startRef.current) / 1000;
      let left = Math.max(0, durationOf() - elapsed);
      // A team locked in → end this phase NOW (their clock drops to 0).
      if (endSignalRef.current !== handledSignalRef.current) {
        handledSignalRef.current = endSignalRef.current;
        left = 0;
      }
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
          // hand the other team half the time to answer
          phaseRef.current = 'steal';
          setPhase('steal');
          setRemaining(seconds / 2); // refill to full immediately (no empty-frame flicker)
          startRef.current = now;
          tickRef.current = 0;
          play('steal');
          onPhase?.('steal');
          rafId = requestAnimationFrame(loop);
          return;
        }
        phaseRef.current = 'done';
        setPhase('done');
        play('wrong');
        onPhase?.('done');
        return;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, seconds, active]);

  if (seconds === 0) return null;
  const total = phase === 'steal' ? seconds / 2 : seconds;
  const pct = Math.max(0, Math.min(1, remaining / total));
  // Pulse ONLY in the last few seconds of a phase (not the whole steal phase — that
  // continuous blink looked broken). The steal phase is signalled by colour + label.
  const urgent = remaining <= 5 && remaining > 0;
  const done = phase === 'done';
  const steal = phase === 'steal';

  // Tint the bar/labels with the colour of whoever's window is live (the other
  // team once we're in the steal/done phases).
  const activeColor = colorById((steal || done ? otherColorId : pickerColorId) ?? 'blue');

  return (
    <div
      className={`timer ${urgent ? 'urgent' : ''} ${done ? 'done' : ''} ${steal ? 'steal' : ''}`}
      data-testid="timer"
      data-phase={phase}
      style={
        {
          '--timer-accent': activeColor.base,
          '--timer-accent-glow': activeColor.glow,
        } as React.CSSProperties
      }
    >
      <span className="timer-label">
        {done ? (
          'Time!'
        ) : steal ? (
          <>
            <span className="timer-bolt" aria-hidden="true">⚡</span> {otherName} answers
          </>
        ) : (
          pickerName
        )}
      </span>
      <div className="timer-bar">
        <div className="timer-fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <span className="timer-num">{done ? '0s' : `${Math.ceil(remaining)}s`}</span>
    </div>
  );
}
