import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

// The longest run of days in a row with nothing spent, up to today; the newest wins a tie.
export function findLongestNoSpendStreak(
  window: SpendWindow,
): Profile.Highlights['longestNoSpendStreak'] {
  let best: { days: number; from: string; to: string } | null = null;
  let runStart: string | null = null;
  let runLength = 0;

  for (const date of window.dates) {
    if ((window.spentByDay.get(date) ?? 0) === 0) {
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
