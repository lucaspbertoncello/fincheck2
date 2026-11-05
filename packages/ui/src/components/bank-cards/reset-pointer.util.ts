import type { PointerEvent } from 'react';

/** Back to rest: no tilt, light at the top left. */
export function resetPointer(event: PointerEvent<HTMLElement>): void {
  const card = event.currentTarget;
  card.style.setProperty('--px', '0');
  card.style.setProperty('--py', '0');
  card.style.setProperty('--lx', '25%');
  card.style.setProperty('--ly', '0%');
}
