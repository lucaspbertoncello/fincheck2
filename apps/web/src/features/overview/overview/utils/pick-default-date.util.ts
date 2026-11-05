import type { StripDay } from '#/features/overview/overview/overview.model.ts';

/** The day the strip opens on: the first with something happening, otherwise the first one. */
export function pickDefaultDate(days: readonly StripDay[]): string {
  return (days.find((day) => day.items.length > 0) ?? days[0])?.date ?? '';
}
