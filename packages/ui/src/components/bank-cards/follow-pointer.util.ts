import type { PointerEvent } from 'react';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Tilt and gloss only with a fine pointer and without reduced motion (implementer 4.2). */
function tiltAllowed(event: PointerEvent<HTMLElement>): boolean {
  if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return false;
  return matchMedia(FINE_POINTER).matches && !matchMedia(REDUCED_MOTION).matches;
}

/** Moves the light and the tilt (up to 8°) with the pointer, through CSS variables. */
export function followPointer(event: PointerEvent<HTMLElement>): void {
  if (!tiltAllowed(event)) return;
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  card.style.setProperty('--px', String(px));
  card.style.setProperty('--py', String(py));
  card.style.setProperty('--lx', `${(px + 0.5) * 100}%`);
  card.style.setProperty('--ly', `${(py + 0.5) * 100}%`);
}
