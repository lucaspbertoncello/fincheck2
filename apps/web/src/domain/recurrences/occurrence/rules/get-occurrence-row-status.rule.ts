import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { RecurrenceStatus } from '@fincheck/ui';

/**
 * The state a row shows. A confirmed occurrence whose amount differs and has no answer yet is
 * "different" (the question "Atualizar o valor esperado?" is open).
 */
export function getOccurrenceRowStatus(occurrence: Occurrence.Dto): RecurrenceStatus {
  switch (occurrence.status) {
    case 'skipped':
      return 'dismissed';
    case 'confirmed':
      return occurrence.difference && occurrence.difference.decision === null
        ? 'different'
        : 'received';
    case 'late':
      return 'late';
    case 'partial':
      return 'partial';
    case 'expected':
      return 'expected';
  }
}
