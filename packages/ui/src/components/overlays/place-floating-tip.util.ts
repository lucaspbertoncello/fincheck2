type Box = { top: number; bottom: number; left: number; right: number };

type PlaceFloatingTipInput = {
  /** The element the tip points at, in viewport coordinates (`getBoundingClientRect`). */
  anchor: Box;
  /** Size of the tip. */
  tip: { width: number; height: number };
  /** Size of the visible window. */
  viewport: { width: number; height: number };
  /** Space between the anchor and the tip. */
  gap: number;
  /** Least space kept between the tip and the edge of the window. */
  margin: number;
};

export type FloatingTipPlacement = {
  /** Viewport coordinates of the tip's top left corner. */
  left: number;
  top: number;
  side: 'top' | 'bottom';
};

/**
 * Where a tip goes, over its anchor when there is room above it in the window, under it when there
 * is not (when neither side fits it takes the one with more room). Centered on the anchor and
 * pushed back inside the window at the left and right edges.
 */
export function placeFloatingTip({
  anchor,
  tip,
  viewport,
  gap,
  margin,
}: PlaceFloatingTipInput): FloatingTipPlacement {
  const needed = tip.height + gap;
  const roomAbove = anchor.top - margin;
  const roomBelow = viewport.height - anchor.bottom - margin;
  const side =
    roomAbove >= needed ? 'top' : roomBelow >= needed || roomBelow > roomAbove ? 'bottom' : 'top';
  const top = side === 'top' ? anchor.top - gap - tip.height : anchor.bottom + gap;
  const centered = (anchor.left + anchor.right) / 2 - tip.width / 2;
  const left = Math.max(margin, Math.min(centered, viewport.width - margin - tip.width));

  return { left, top, side };
}
