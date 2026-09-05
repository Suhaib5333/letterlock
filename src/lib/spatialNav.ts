/**
 * Spatial focus manager for remotes and keyboards (LAUNCH_PLAN.md Phase 3b).
 *
 * A TV remote reaches the WebView as plain key events: arrows, Enter, Back
 * (Escape / `GoBack`). This module makes the whole app playable with those:
 *
 *   - Arrow keys move focus to the NEAREST focusable control in that direction
 *     (the plan's "nearest rectangle" rung: candidates whose rect lies in the
 *     direction of travel, ranked by distance along the travel axis, then by
 *     how far off-axis they sit). Pure functions, unit-tested with fake rects.
 *   - Enter / Space are left to the browser (native activation, no double fire).
 *   - Back (Escape, `GoBack`, or Backspace outside a text field) closes the
 *     top-most overlay, or on the board opens the existing exit confirm, or on
 *     any other sub-screen presses its "‹ Back" button. Never a dead end.
 *   - Roving focus: whenever focus is lost (a screen or dialog unmounted) the
 *     primary control of the new screen is focused, so a remote user is never
 *     focus-less. Only for keyboard users (and always in TV mode), so pointer
 *     behaviour on phones and desktops is unchanged.
 *
 * Scope: inside the top-most open `[role="dialog"]` when one is open, else the
 * current `.ll-screen`. The hex board has no arrow handling of its own (its
 * gridcells are tabbable and take Enter/Space), so the same nearest-rectangle
 * rule moves the cursor across hexes too.
 */

export type Dir = 'left' | 'right' | 'up' | 'down';
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const DIR_KEYS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};
const BACK_KEYS = new Set(['Escape', 'GoBack', 'BrowserBack']);

export const FOCUSABLE =
  'a[href], button:not([disabled]), [role="button"], [role="option"], [role="tab"], ' +
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Anything that can dim the screen and must go first on Back. */
const OVERLAY = '[role="dialog"], .qcard-map-fs-scrim';
const SCRIM = '.modal-scrim, .cat-scrim, .qcard-map-fs-scrim, [class$="-scrim"]';
const CANCEL =
  '[data-testid$="-cancel"], [data-testid$="-close"], [data-testid$="-dismiss"], ' +
  '[aria-label="Close"], [aria-label="Dismiss"], .modal-close, .exit-keep';

/** The control a remote user most likely wants first on each screen. */
const PRIMARY = [
  '[data-testid="start-match"]:not([disabled])',
  '[data-testid="play-button"]',
  '[data-testid="mode-couch"]',
  // The board outranks a generic .btn-primary: `.ll-hex.claimable` exists only on
  // the game screen, and there the board IS the primary control. Ordered the other
  // way round, awarding a hex unmounted the host pad and dropped the remote's focus
  // onto whatever plain button the game header happened to render.
  '.ll-hex.claimable',
  '.btn-primary:not([disabled])',
  '.mode-card:not([disabled])',
];

// ---------------------------------------------------------------------------
// Pure geometry (unit-tested)
// ---------------------------------------------------------------------------

/** Rotate a rect so that `dir` becomes "+x" (travel axis) and the other axis is y. */
function orient(r: Rect, dir: Dir): Rect {
  switch (dir) {
    case 'right':
      return r;
    case 'left':
      return { left: -r.right, right: -r.left, top: r.top, bottom: r.bottom };
    case 'down':
      return { left: r.top, right: r.bottom, top: r.left, bottom: r.right };
    case 'up':
      return { left: -r.bottom, right: -r.top, top: r.left, bottom: r.right };
  }
}

/**
 * Score a candidate for a move from `from` towards `dir`. Lower is better;
 * `null` means the candidate is not in that direction. A candidate counts as
 * "ahead" when its leading edge is past our centre (so an overlapping
 * neighbour, like the next hex row, still qualifies; a control that mostly
 * overlaps us does not).
 */
export function score(from: Rect, to: Rect, dir: Dir): number | null {
  const f = orient(from, dir);
  const t = orient(to, dir);
  if (t.left < (f.left + f.right) / 2) return null;
  const primary = Math.max(0, t.left - f.right);
  // Off-axis: distance between the two cross-axis intervals (0 when they overlap),
  // plus a small centre-offset term to break ties between overlapping candidates.
  const gap = Math.max(0, t.top - f.bottom, f.top - t.bottom);
  const offset = Math.abs((t.top + t.bottom) / 2 - (f.top + f.bottom) / 2);
  return primary + gap * 2 + offset * 0.25;
}

/** Index of the best candidate for a move, or -1 when nothing lies that way. */
export function pickNext(from: Rect, candidates: readonly Rect[], dir: Dir): number {
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((c, i) => {
    const s = score(from, c, dir);
    if (s !== null && s < bestScore) {
      bestScore = s;
      best = i;
    }
  });
  return best;
}

// ---------------------------------------------------------------------------
// DOM glue
// ---------------------------------------------------------------------------

let tvMode = false;
let keyboardUser = false;

function isVisible(el: Element): boolean {
  if (!el.isConnected || el.closest('[aria-hidden="true"], [inert]')) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}

function last<T extends Element>(sel: string): T | null {
  const all = document.querySelectorAll<T>(sel);
  return all.length ? all[all.length - 1] : null;
}

/** Where arrows may land: the top-most dialog, else the current screen. */
function scope(): Element {
  return last('[role="dialog"]') ?? last('.ll-screen') ?? document.body;
}

function candidates(root: Element): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);
}

function isTextEntry(el: Element | null): el is HTMLElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) return !/^(button|checkbox|radio|submit|reset|file)$/.test(el.type);
  return (el as HTMLElement).isContentEditable === true;
}

/** Arrows the field itself needs (caret, option list, slider); leave those alone. */
function fieldOwnsArrow(el: Element | null, dir: Dir): boolean {
  if (!isTextEntry(el)) return false;
  if (el instanceof HTMLInputElement && el.type === 'range') return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return dir === 'left' || dir === 'right';
}

function focusPrimary(): void {
  const root = scope();
  for (const sel of PRIMARY) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el && isVisible(el)) {
      el.focus({ preventScroll: true });
      return;
    }
  }
  const all = candidates(root);
  const pick = all.find((el) => !el.matches('.icon-btn, .sub-head *')) ?? all[0];
  pick?.focus({ preventScroll: true });
}

function moveFocus(from: HTMLElement, dir: Dir): boolean {
  const fromRect = from.getBoundingClientRect();
  const pool = candidates(scope()).filter((el) => el !== from && !from.contains(el) && !el.contains(from));
  const i = pickNext(fromRect, pool.map((el) => el.getBoundingClientRect()), dir);
  if (i < 0) return false;
  pool[i].focus();
  return true;
}

/** Back: close the top-most overlay, else leave the board (exit confirm), else "‹ Back". */
function goBack(): boolean {
  const overlay = last<HTMLElement>(OVERLAY);
  if (overlay) {
    // Dialogs built on useModalDismiss already closed on this same Escape (their
    // capture listener stops propagation, so we never get here for them). The
    // ad-hoc overlays close through their own window listener next; whatever
    // is still open after a frame gets its cancel button / scrim clicked.
    requestAnimationFrame(() => {
      if (!overlay.isConnected) return;
      const cancel = overlay.querySelector<HTMLElement>(CANCEL);
      if (cancel) cancel.click();
      else (overlay.matches(SCRIM) ? overlay : overlay.closest<HTMLElement>(SCRIM))?.click();
    });
    return true;
  }
  const screen = last('.ll-screen');
  if (!screen) return false;
  const exit = screen.querySelector<HTMLElement>('[data-testid="game-screen"] [data-testid="exit-btn"]');
  if (exit) {
    exit.click();
    return true;
  }
  const back = screen.querySelector<HTMLElement>('.sub-head .btn-ghost');
  if (back) {
    back.click();
    return true;
  }
  return false; // Home with nothing open: nowhere to go, do nothing
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const target = e.target instanceof HTMLElement || e.target instanceof SVGElement ? e.target : null;
  const dir = DIR_KEYS[e.key];
  if (dir) {
    if (fieldOwnsArrow(target, dir)) return;
    if (!target || target === document.body) {
      focusPrimary();
      e.preventDefault();
      return;
    }
    if (moveFocus(target as HTMLElement, dir)) e.preventDefault();
    return;
  }
  const isBack = BACK_KEYS.has(e.key) || (e.key === 'Backspace' && !isTextEntry(target));
  if (isBack && goBack()) e.preventDefault();
}

/** True when the app is being driven by keys (a remote, or a keyboard user). */
export function isKeyboardUser(): boolean {
  return tvMode || keyboardUser;
}

/**
 * Call once at boot (main.tsx). Idempotent; a no-op without a DOM. `tv` puts
 * the manager in TV mode (roving focus always on); arrows and Back work for
 * every keyboard user regardless.
 */
export function initSpatialNav(opts: { tv?: boolean } = {}): void {
  if (typeof document === 'undefined' || document.documentElement.dataset.spatialNav) return;
  document.documentElement.dataset.spatialNav = '1';
  tvMode = !!opts.tv;

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keydown', () => (keyboardUser = true), true);
  document.addEventListener('pointerdown', () => (keyboardUser = false), true);

  // Roving focus: when the focused element disappears (screen change, dialog
  // closed without a restore target), land on the new screen's primary control.
  let queued = false;
  const settle = () => {
    queued = false;
    if (!isKeyboardUser()) return;
    const a = document.activeElement;
    if (a && a !== document.body && isVisible(a)) return;
    focusPrimary();
  };
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(settle));
  }).observe(document.body, { childList: true, subtree: true });
}
