import { useEffect, type RefObject } from 'react';

/**
 * Baseline modal accessibility, shared by every dialog (settings, category,
 * auth, leaderboard, admin, pack editor):
 *   • Escape closes it (unless `closeOnEscape` is false — e.g. a forced
 *     username-claim gate that must not be dismissable).
 *   • Focus moves into the dialog on open and is restored to the previously
 *     focused element (the trigger) on close.
 *   • Tab is trapped inside the dialog so keyboard users can't wander behind it.
 */
export function useModalDismiss(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  opts: { closeOnEscape?: boolean } = {},
): void {
  const closeOnEscape = opts.closeOnEscape !== false;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = ref.current;

    // Move focus into the dialog (first focusable, else the dialog itself) —
    // but never steal focus from a field that already autofocused itself.
    if (node) {
      const focusables = node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      // Defer so it runs after the entrance animation mounts the content.
      requestAnimationFrame(() => {
        if (node.contains(document.activeElement)) return; // already focused inside
        (first ?? node).focus?.();
      });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !node) return;
      const focusables = [...node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
