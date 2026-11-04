import { type RefObject, useLayoutEffect, useRef } from 'react';

import {
  SIDE_RESIZE_DURATION_MS,
  SIDE_RESIZE_EASING,
} from '#/shared/layouts/application/transition/side-resize.constant.ts';

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Animates the height of the desktop pair (icon rail + left box) when the left box changes kind,
 * that is, when `flipKey` flips (the summary panel becomes the Configurações menu and back). The
 * pair has no height of its own (the left box decides it), so the swap used to jump.
 *
 * How: the commit that flips the key already holds the new content, so the hook pins the pair at
 * the height it had before (`data-resizing` makes the boxes fill it and clip their content), waits
 * two frames for the new content to settle (the menu is portaled one render later), measures the
 * natural height and animates `height` from the old one to it with the system duration and curve.
 * The real elements resize, so nothing is stretched or distorted: the contents are revealed from
 * the top and fade in (see `side-resize.css`). The rail follows because it stretches with the
 * pair, and its icons stay centered. With reduced motion, or without `Element.animate`, it does
 * nothing and the swap is instant.
 */
export function useSideResize(ref: RefObject<HTMLElement | null>, flipKey: boolean) {
  const lastHeight = useRef<number | null>(null);
  const previousKey = useRef<boolean | null>(null);
  const busy = useRef(false);

  // Remembers the height of the pair while nothing is animating (it is the "from" of the next flip).
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      if (!busy.current) lastHeight.current = element.offsetHeight;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  useLayoutEffect(() => {
    const element = ref.current;
    const flipped = previousKey.current !== null && previousKey.current !== flipKey;
    previousKey.current = flipKey;
    if (!flipped || !element) return;

    const from = lastHeight.current;
    if (!from || prefersReducedMotion() || typeof element.animate !== 'function') return;

    busy.current = true;
    element.style.height = `${from}px`;
    element.dataset['resizing'] = '';

    let animation: Animation | undefined;
    let outer = 0;
    let inner = 0;
    const finish = () => {
      delete element.dataset['resizing'];
      element.style.height = '';
      busy.current = false;
      lastHeight.current = element.offsetHeight;
    };

    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        delete element.dataset['resizing'];
        element.style.height = '';
        const to = element.offsetHeight;
        if (Math.abs(to - from) < 2) {
          finish();
          return;
        }
        element.dataset['resizing'] = '';
        animation = element.animate(
          { height: [`${from}px`, `${to}px`] },
          { duration: SIDE_RESIZE_DURATION_MS, easing: SIDE_RESIZE_EASING },
        );
        animation.onfinish = finish;
        animation.oncancel = finish;
      });
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      // Only a flip that arrives mid-animation (or mid-hold) has something to hand over: the height
      // on screen right now. A finished animation already stored the final one, and at this point
      // the DOM holds the NEW content, so measuring it here would corrupt the next "from".
      if (!busy.current) return;
      const current = element.getBoundingClientRect().height;
      if (animation) {
        animation.onfinish = null;
        animation.oncancel = null;
        animation.cancel();
      }
      delete element.dataset['resizing'];
      element.style.height = '';
      busy.current = false;
      lastHeight.current = current;
    };
  }, [ref, flipKey]);
}
