import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

// The weekday with the biggest average spending per occurrence of that weekday in the window
// (every Saturday counts, spent or not).
export function findCostliestWeekday(window: SpendWindow): Profile.Highlights['costliestWeekday'] {
  const totals = Array.from({ length: 7 }, () => 0);
  const occurrences = Array.from({ length: 7 }, () => 0);
  for (const date of window.dates) {
    const weekday = weekdayOf(date);
    totals[weekday] = (totals[weekday] ?? 0) + (window.spentByDay.get(date) ?? 0);
    occurrences[weekday] = (occurrences[weekday] ?? 0) + 1;
  }

  let best: { weekday: number; averageCents: number } | null = null;
  totals.forEach((total, weekday) => {
    const count = occurrences[weekday] ?? 0;
    const averageCents = count > 0 ? Math.round(total / count) : 0;
    if (averageCents > (best?.averageCents ?? 0)) best = { weekday, averageCents };
  });

  return best;
}
