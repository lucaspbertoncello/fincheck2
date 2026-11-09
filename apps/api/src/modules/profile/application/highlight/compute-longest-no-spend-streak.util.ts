import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

type Streak = NonNullable<Profile.Highlights['longestNoSpendStreak']>;

// The longest run of days in a row with no spending, up to `to` (BR-PRF-005). A day counts as
// spent when its lines end above zero. The count starts the day after the first day with spending:
// the days before the app had any data are not days he did not spend. A tie goes to the most
// recent run. `null` when there is no spending at all or every day since the first is spent. Pure.
export function computeLongestNoSpendStreak(
  lines: ProfileSpendingReader.Line[],
  to: BusinessDate,
): Profile.Highlights['longestNoSpendStreak'] {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.on, (totals.get(line.on) ?? 0) + line.cents);

  const spentDays = [...totals.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([day]) => day)
    .toSorted();
  const first = spentDays[0];
  if (first === undefined) return null;
  const spent = new Set(spentDays);

  let best: Streak | null = null;
  let runStart: BusinessDate | null = null;
  let runDays = 0;

  for (let day = BusinessDate.of(first).addDays(1); !to.isBefore(day); day = day.addDays(1)) {
    if (!spent.has(day.value)) {
      runStart ??= day;
      runDays += 1;
      continue;
    }
    if (runStart !== null && (best === null || runDays >= best.days)) {
      best = { days: runDays, from: runStart.value, to: day.addDays(-1).value };
    }
    runStart = null;
    runDays = 0;
  }
  if (runStart !== null && (best === null || runDays >= best.days)) {
    best = { days: runDays, from: runStart.value, to: to.value };
  }

  return best;
}
