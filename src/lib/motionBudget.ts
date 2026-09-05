/**
 * Motion budget for low-end phones (LAUNCH_PLAN.md Phase 1b). The hero moments
 * (hex claim pop, winning trace) always play; everything ambient is cut when the
 * device asks for it: Data Saver on, 4 GB of RAM or less, or reduced motion.
 *
 * `applyMotionBudget()` stamps `<html data-lowpower>` so CSS can drop the board
 * drop-shadow filter, the hex texture overlay and the idle glow loops
 * (src/app/mobile.css); `confettiScale()` halves the particle count in JS.
 */

type NavExtras = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

export function lowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const n = navigator as NavExtras;
  if (n.connection?.saveData) return true;
  if (typeof n.deviceMemory === 'number' && n.deviceMemory <= 4) return true;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  }
  return false;
}

/** Idempotent: sets or clears `html[data-lowpower]` from the current device signals. */
export function applyMotionBudget(): boolean {
  const low = lowPower();
  if (typeof document !== 'undefined') {
    if (low) document.documentElement.dataset.lowpower = '1';
    else delete document.documentElement.dataset.lowpower;
  }
  return low;
}

/** Particle multiplier for canvas-confetti bursts: 1 normally, 0.5 on a constrained device. */
export function confettiScale(): number {
  return lowPower() ? 0.5 : 1;
}
