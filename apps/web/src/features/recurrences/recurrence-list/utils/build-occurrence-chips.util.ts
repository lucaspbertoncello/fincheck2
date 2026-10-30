import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { OccurrenceChipData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import { formatShortDate } from '#/features/recurrences/recurrence-list/utils/format-short-date.util.ts';
import { getOccurrencePlacement } from '#/features/recurrences/recurrence-list/utils/get-occurrence-placement.util.ts';

/**
 * The chips under the strip: what is late from earlier months and what has no day this month
 * ("Mesada, sem data"). Dismissed and already confirmed ones do not need one.
 */
export function buildOccurrenceChips(
  month: string,
  occurrences: readonly Occurrence.Dto[],
): OccurrenceChipData[] {
  const chips: OccurrenceChipData[] = [];

  for (const occurrence of occurrences) {
    if (occurrence.carriedOver && occurrence.status === 'late') {
      const due = occurrence.expectedOn ?? occurrence.windowEndOn;
      chips.push({
        key: occurrence.id,
        label: `${occurrence.recurrenceName} atrasada, venceu ${formatShortDate(due)}`,
        tone: 'warn',
      });
      continue;
    }
    if (occurrence.month !== month || occurrence.status === 'confirmed') continue;
    const placement = getOccurrencePlacement(occurrence);
    if (placement && placement.date === null && occurrence.expectedOn === null) {
      chips.push({
        key: occurrence.id,
        label: `${occurrence.recurrenceName}, sem data`,
        tone: 'neutral',
      });
    }
  }

  return chips;
}
