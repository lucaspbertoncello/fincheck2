import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
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

    if (record.month === month) {
      const dto = presentOccurrence(database, record);
      // An archived recurrence only shows what already has a payment or a mark (history).
      if (archived && dto.payments.length === 0 && !record.settledAt && !record.skippedAt) continue;
      result.push(dto);
    } else if (month === CURRENT_MONTH && record.month < month && !archived) {
      const dto = presentOccurrence(database, record, { carriedOver: true });
      if (dto.needsAttention) result.push(dto);
    }
  }

  return result.sort(byExpectedOn);
}
