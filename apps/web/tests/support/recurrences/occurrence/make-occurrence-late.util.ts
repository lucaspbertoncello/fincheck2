import { db } from '#mocks/state/mock-database.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';

// Moves the window of a recurrence's occurrence of this month to the days before today, so it is
// late whatever day the seed was built on. Call it after the database reset, before rendering.
export function makeOccurrenceLate(recurrenceName: string): void {
  const recurrence = db.recurrences.find((item) => item.name === recurrenceName);
  const occurrence = db.occurrences.find(
    (item) => item.recurrenceId === recurrence?.id && item.month === CURRENT_MONTH,
  );
  if (!occurrence) throw new Error(`No occurrence of ${recurrenceName} this month`);

  occurrence.windowStartOn = addDays(TODAY, -6);
  occurrence.expectedOn = addDays(TODAY, -4);
  occurrence.windowEndOn = addDays(TODAY, -2);
}
