import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type {
  OccurrenceDayData,
  OccurrenceRowData,
} from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import { getOccurrencePlacement } from '#/features/recurrences/recurrence-list/utils/get-occurrence-placement.util.ts';

type Entry = { occurrence: Occurrence.Dto; row: OccurrenceRowData };

function listMonthDates(month: string): string[] {
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return Array.from(
    { length: last },
    (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
  );
}

/** Every day of the month with the markers and rows of what sits on it ("Outubro, dia a dia"). */
export function buildOccurrenceDays(month: string, entries: readonly Entry[]): OccurrenceDayData[] {
  const days = new Map<string, OccurrenceDayData>(
    listMonthDates(month).map((date) => [date, { date, markers: [], items: [] }]),
  );

  for (const { occurrence, row } of entries) {
    if (occurrence.month !== month) continue;
    const placement = getOccurrencePlacement(occurrence);
    const day = placement?.date ? days.get(placement.date) : undefined;
    if (!placement || !day) continue;
    day.markers.push({ flow: occurrence.kind, status: placement.marker });
    day.items.push(row);
  }

  return [...days.values()];
}
