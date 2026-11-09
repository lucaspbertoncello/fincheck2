import { useEffect, useRef } from 'react';

/**
 * How long the layout takes to settle after the filter arrives: the chip opens in a `Collapse`
 * (240 ms) and the lines that no longer match leave. A smooth scroll started during that movement
 * is cancelled by the browser, so the scroll waits for it to end (this is a little more than the
 * `Collapse`).
 */
const LAYOUT_SETTLE_MS = 400;

/**
 * Brings the start of the filtered list into view when `?show=missing` arrives (a click on "faltam",
 * a link from another screen, a typed address), once the content is on screen and the layout has
 * settled: once per arrival, not on every render, and again only after the filter was cleared. The
 * target is read when the scroll fires, not when it is scheduled. With "reduzir movimento" it still
 * goes there, without the glide.
 */
export function useScrollToMissingFilter(isActive: boolean, isReady: boolean) {
  const target = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!isActive) {
      done.current = false;
      return;
    }
    if (!isReady || done.current) return;

    const timer = window.setTimeout(() => {
      done.current = true;
      const element = target.current;
      if (!element || typeof element.scrollIntoView !== 'function') return;
      const reduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }, LAYOUT_SETTLE_MS);

    return () => window.clearTimeout(timer);
  }, [isActive, isReady]);

  return target;
}
