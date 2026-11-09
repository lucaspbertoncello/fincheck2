import { weekdayOf } from '@fincheck/shared/common/date/weekday-of.util.ts';
import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The weekday on which he spends the most (BR-PRF-005): the average per occurrence of that weekday
// in the period, counting the days with no spending too (0 is Sunday). The average is rounded to
// the cent. A tie goes to the smaller weekday. `null` when no weekday averages above a cent. Pure.
export function computeCostliestWeekday(
  lines: ProfileSpendingReader.Line[],
  period: { from: BusinessDate; to: BusinessDate },
): Profile.Highlights['costliestWeekday'] {
  const occurrences = Array.from({ length: 7 }, () => 0);
  for (let day = period.from; !period.to.isBefore(day); day = day.addDays(1)) {
    occurrences[day.weekday()] = (occurrences[day.weekday()] ?? 0) + 1;
  }

  const totals = Array.from({ length: 7 }, () => 0);
  for (const line of lines) {
    const weekday = weekdayOf(line.on);
    totals[weekday] = (totals[weekday] ?? 0) + line.cents;
  }

  let best: { weekday: number; averageCents: number } | null = null;
  for (let weekday = 0; weekday < 7; weekday++) {
    const count = occurrences[weekday] ?? 0;
    if (count === 0) continue;
    const averageCents = Math.round((totals[weekday] ?? 0) / count);
    if (averageCents > 0 && (best === null || averageCents > best.averageCents)) {
      best = { weekday, averageCents };
    }
  }

  return best;
}
