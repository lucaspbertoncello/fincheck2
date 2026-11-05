import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// The Dto of a recurrence's occurrence in a month, or null when it has none.
export function findMonthOccurrence(
  database: MockState.Database,
  recurrenceId: string,
  month: string,
): Occurrence.Dto | null {
  const record = database.occurrences.find(
    (item) => item.recurrenceId === recurrenceId && item.month === month,
  );

  return record ? presentOccurrence(database, record) : null;
}
