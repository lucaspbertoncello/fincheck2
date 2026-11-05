import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

// The month with the biggest spending in the window (the newest wins a tie).
export function findCostliestMonth(window: SpendWindow): Profile.Highlights['costliestMonth'] {
  const byMonth = new Map<string, number>();
  for (const [date, spent] of window.spentByDay)
    byMonth.set(date.slice(0, 7), (byMonth.get(date.slice(0, 7)) ?? 0) + spent);

  const [top] = [...byMonth.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]));

  return top && top[1] > 0 ? { month: top[0], totalCents: top[1] } : null;
}
