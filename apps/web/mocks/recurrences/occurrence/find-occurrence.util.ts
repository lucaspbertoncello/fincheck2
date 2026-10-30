import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

export function findOccurrence(
  database: MockState.Database,
  id: string,
): MockState.OccurrenceRecord {
  return (
    database.occurrences.find((occurrence) => occurrence.id === id) ??
    fail(404, 'OCCURRENCE_NOT_FOUND', 'A ocorrência não existe')
  );
}
