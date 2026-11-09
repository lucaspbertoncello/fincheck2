import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';

function byExpectedOn(a: Occurrence.Dto, b: Occurrence.Dto): number {
  if (a.expectedOn === null && b.expectedOn !== null) return 1;
  if (a.expectedOn !== null && b.expectedOn === null) return -1;
  if (a.expectedOn !== b.expectedOn) return (a.expectedOn ?? '').localeCompare(b.expectedOn ?? '');

  return a.recurrenceName.localeCompare(b.recurrenceName, 'pt-BR');
}

// The occurrences of a month. In the current month, also the ones from earlier months that still
// ask for an action (late, or a different value nobody answered), marked `carriedOver`.
export function listMonthOccurrences(
  database: MockState.Database,
  month: string,
): Occurrence.Dto[] {
  ensureOccurrences(database);
  const result: Occurrence.Dto[] = [];

  for (const record of database.occurrences) {
    const recurrence = database.recurrences.find((item) => item.id === record.recurrenceId);
    const archived = recurrence?.archivedAt != null;
    const paused = recurrence?.pausedAt != null;

    if (record.month === month) {
      const dto = presentOccurrence(database, record);
      // An archived recurrence only shows its history: what has a link on record (even to an
      // ignored transaction), a settle or a skip. The link kept on record is the fact.
      if (archived && record.payments.length === 0 && !record.settledAt && !record.skippedAt) {
        continue;
      }
      result.push(dto);
    } else if (
      month === CURRENT_MONTH &&
      record.month < month &&
      record.month >= addMonths(month, -3) &&
      !archived &&
      !paused
    ) {
      const dto = presentOccurrence(database, record, { carriedOver: true });
      if (dto.needsAttention) result.push(dto);
    }
  }

  return result.sort(byExpectedOn);
}
