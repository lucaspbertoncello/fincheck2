import { useEffect, type RefObject } from 'react';

/** Where the focus goes when nothing asked for it: the first field that takes typing. */
export const DEFAULT_INITIAL_FOCUS =
  'input:not([type=hidden]):not([disabled]):not([readonly]), textarea:not([disabled])';

/**
 * Puts the focus on the first match of `selector` inside `ref` when the modal opens, unless a field
 * already took it (an `autoFocus` in the content wins). The modal's own focus on the dialog box
 * happens after this effect, finds the focus inside, and leaves it alone.
 */
export function useInitialFocus(
  ref: RefObject<HTMLElement | null>,
  selector: string = DEFAULT_INITIAL_FOCUS,
): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && root.contains(active) && active.matches(selector)) return;
    root.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [ref, selector]);
}
