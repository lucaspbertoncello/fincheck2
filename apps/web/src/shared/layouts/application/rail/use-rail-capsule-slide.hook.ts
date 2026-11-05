import { type RefObject, useLayoutEffect, useRef } from 'react';

import {
  SIDE_RESIZE_DURATION_MS,
  SIDE_RESIZE_EASING,
} from '#/shared/layouts/application/transition/side-resize.constant.ts';

/** Two frames: the wait `useSideResize` makes before it starts animating the height. */
const FRAMES_BEFORE_RESIZE_MS = 34;

const CAPSULE = '.tab-indicator';

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Top of the active icon cell (the capsule's parent) inside the pair; not moved by transforms. */
function activeCellTop(pair: HTMLElement): number | null {
  const cell = pair.querySelector(CAPSULE)?.parentElement;
  return cell ? cell.getBoundingClientRect().top - pair.getBoundingClientRect().top : null;
}

/**
 * Slides the capsule of the rail to the icon of the new screen when the left column changes kind
 * (`flipKey` flips: entering or leaving Configurações). The other tab changes use the
 * `tab-ind` view transition, but here the pair is resizing in the DOM and the icons glide with
 * it, so a captured capsule would land where the icon was, not where it ends. Instead the
 * capsule, a child of its icon cell, starts offset to where the old capsule was and eases to
 * zero with the same duration and curve as the resize: the cell moves by the resize while the
 * offset closes, and the sum is a straight glide from the old icon to the final place.
 *
 * Call it after `useSideResize`, so the pair is already pinned at its old height when the new
 * capsule is measured. With reduced motion the capsule jumps.
 */
export function useRailCapsuleSlide(pairRef: RefObject<HTMLElement | null>, flipKey: boolean) {
  const lastTop = useRef<number | null>(null);
  const previousKey = useRef<boolean | null>(null);

  // The icons move when the panel grows or shrinks (data arriving), with no render of the rail.
  useLayoutEffect(() => {
    const pair = pairRef.current;
    if (!pair || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      lastTop.current = activeCellTop(pair);
    });
    observer.observe(pair);
    return () => observer.disconnect();
  }, [pairRef]);

  // While nothing flips, remembers where the capsule is: it is the "from" of the next flip.
  useLayoutEffect(() => {
    const pair = pairRef.current;
    if (!pair) return;
    const flipped = previousKey.current !== null && previousKey.current !== flipKey;
    previousKey.current = flipKey;
    const top = activeCellTop(pair);

    if (!flipped) {
      lastTop.current = top;
      return;
    }
    const from = lastTop.current;
    lastTop.current = top;
    const capsule = pair.querySelector<HTMLElement>(CAPSULE);
    if (from === null || top === null || !capsule) return;
    if (prefersReducedMotion() || typeof capsule.animate !== 'function') return;
    const offset = from - top;
    if (Math.abs(offset) < 1) return;

    capsule.animate([{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }], {
      duration: SIDE_RESIZE_DURATION_MS,
      easing: SIDE_RESIZE_EASING,
      delay: FRAMES_BEFORE_RESIZE_MS,
      fill: 'backwards',
    });
  });
}
