import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';

// Creates the occurrences that are missing, from the current month to three months ahead. Safe to
// call on every read: it never touches one that exists.
export function ensureOccurrences(database: MockState.Database): void {
  for (let step = 0; step <= 3; step += 1) {
    const month = addMonths(CURRENT_MONTH, step);

    for (const recurrence of database.recurrences) {
      if (recurrence.pausedAt || recurrence.archivedAt || recurrence.startsMonth > month) continue;
      const exists = database.occurrences.some(
        (item) => item.recurrenceId === recurrence.id && item.month === month,
      );
      if (exists) continue;

      database.occurrences.push({
        id: newId(),
        recurrenceId: recurrence.id,
        month,
        ...computeOccurrenceWindow(recurrence.dateRule, month),
        expectedAmountCents: recurrence.expectedAmountCents,
        settledAt: null,
        skippedAt: null,
        decision: null,
        payments: [],
      });
    }
  }
}
