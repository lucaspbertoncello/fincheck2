import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from 'react';

import {
  RAIL_CLOSE_DELAY_MS,
  RAIL_OPEN_DELAY_MS,
} from '#/shared/layouts/application/rail/rail-timing.constant.ts';

/** Whether the focused element got focus from the keyboard (a click on a link does not count). */
function isKeyboardFocus(target: EventTarget): boolean {
  try {
    return target instanceof Element && target.matches(':focus-visible');
  } catch {
    return false;
  }
}

/**
 * Open state of the rail. It opens when the pointer rests on it (after a short delay), at once
 * when a link takes keyboard focus, and stays open while the "+" menu is open; it closes after a
 * longer grace period once none of the three holds. A click does not keep it open: only the pointer
 * or keyboard focus does.
 */
export function useRailOpen() {
  const [open, setOpen] = useState(false);
  const holds = useRef({ pointer: false, focus: false, menu: false });
  const timer = useRef<number | undefined>(undefined);
  const railRef = useRef<HTMLElement>(null);

  const sync = useCallback(() => {
    window.clearTimeout(timer.current);
    const { pointer, focus, menu } = holds.current;
    const wanted = pointer || focus || menu;
    const delay = wanted ? (focus || menu ? 0 : RAIL_OPEN_DELAY_MS) : RAIL_CLOSE_DELAY_MS;
    if (delay === 0) setOpen(wanted);
    else timer.current = window.setTimeout(() => setOpen(wanted), delay);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const setMenuOpen = useCallback(
    (isOpen: boolean) => {
      holds.current.menu = isOpen;
      // The pointer may have left while the menu was open and nobody told the rail.
      if (!isOpen) holds.current.pointer = railRef.current?.matches(':hover') ?? false;
      sync();
    },
    [sync],
  );

  const railProps = {
    ref: railRef,
    onPointerEnter(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      holds.current.pointer = true;
      sync();
    },
    onPointerLeave() {
      holds.current.pointer = false;
      sync();
    },
    onFocus(event: FocusEvent) {
      if (!isKeyboardFocus(event.target)) return;
      holds.current.focus = true;
      sync();
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      holds.current.focus = false;
      sync();
    },
  };

  return { open, railProps, setMenuOpen };
}
