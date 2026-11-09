import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

// The longest run of days in a row with nothing spent, up to today (PM, 08/11). A day counts as
// spent when its lines end above zero. The count starts the day after the first day with spending:
// the days before the app had any data are not days he did not spend. The newest run wins a tie.
// Null when there is no spending at all or every day since the first is spent.
export function findLongestNoSpendStreak(
  window: SpendWindow,
): Profile.Highlights['longestNoSpendStreak'] {
  const firstIndex = window.dates.findIndex((date) => (window.spentByDay.get(date) ?? 0) > 0);
  if (firstIndex === -1) return null;

  let best: { days: number; from: string; to: string } | null = null;
  let runStart: string | null = null;
  let runLength = 0;

  for (const date of window.dates.slice(firstIndex + 1)) {
    if ((window.spentByDay.get(date) ?? 0) <= 0) {
      runStart ??= date;
      runLength += 1;
      if (runLength >= (best?.days ?? 0)) best = { days: runLength, from: runStart, to: date };
    } else {
      runStart = null;
      runLength = 0;
    }
  }

  return best;
}
