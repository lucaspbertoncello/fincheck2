import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { RecurrenceInlineAction } from '@fincheck/ui';

/**
 * Buttons under a row: what the person can do while the money has not come (or not left) yet. Two
 * at most, the main one first; "Editar valor esperado" stays in the "…" menu.
 */
export function getOccurrenceInlineActions(occurrence: Occurrence.Dto): RecurrenceInlineAction[] {
  if (occurrence.status === 'late') return ['mark-done', 'link'];
  if (occurrence.kind === 'income' && occurrence.status === 'expected') {
    return ['link', 'mark-done'];
  }
  if (occurrence.kind === 'income' && occurrence.status === 'partial') {
    return ['link'];
  }

  return [];
}
