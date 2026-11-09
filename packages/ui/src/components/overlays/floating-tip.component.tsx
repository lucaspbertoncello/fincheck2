import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  placeFloatingTip,
  type FloatingTipPlacement,
} from '#/components/overlays/place-floating-tip.util.ts';

/** Space between the anchor and the tip (the scale's 8). */
const TIP_GAP_PX = 8;
/** Space kept between the tip and the edge of the window. */
const TIP_MARGIN_PX = 8;

type FloatingTipProps = {
  /** The element the tip points at (a day of the spend map, a point of a chart). */
  anchor: HTMLElement;
  /** What the tip says; keep it to one line. */
  children: ReactNode;
};

/**
 * The dark tip of a data point, drawn on `document.body` over everything (`z-floating-tip`), so no box
 * with `overflow` (a scroller, a folding section, the page frame) can cut it. It opens over the
 * anchor and, without room above it in the window, under it; it never leaves the window sideways.
 * It follows the anchor while the page or a scroller moves. Not interactive and hidden from
 * assistive technology: the anchor carries the same information in its own name.
 */
export function FloatingTip({ anchor, children }: FloatingTipProps) {
  const tipRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<FloatingTipPlacement | null>(null);

  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip) return;
    let frame = 0;
    // A tip whose anchor left the page (the month changed under a still mouse) is hidden, not left at the corner.
    const measure = () => {
      frame = 0;
      if (!anchor.isConnected) {
        setPlacement(null);
        return;
      }
      const next = placeFloatingTip({
        anchor: anchor.getBoundingClientRect(),
        tip: { width: tip.offsetWidth, height: tip.offsetHeight },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        gap: TIP_GAP_PX,
        margin: TIP_MARGIN_PX,
      });
      setPlacement((current) =>
        current &&
        current.left === next.left &&
        current.top === next.top &&
        current.side === next.side
          ? current
          : next,
      );
    };
    // Scroll and resize fire many times per frame: measure once per frame.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(tip);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
    // `children` is a dependency on purpose: every render of the owner measures again, so a tip whose
    // anchor left the page is hidden at once, not at the next scroll.
  }, [anchor, children]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={tipRef}
      aria-hidden="true"
      data-side={placement?.side}
      className="pointer-events-none fixed top-0 left-0 z-(--z-floating-tip) w-max max-w-[calc(100vw-var(--space-16))] rounded-input bg-fg-primary px-s12 py-s8 text-meta whitespace-nowrap text-page shadow-(--shadow-tooltip)"
      style={{
        transform: placement ? `translate(${placement.left}px, ${placement.top}px)` : undefined,
        visibility: placement ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
