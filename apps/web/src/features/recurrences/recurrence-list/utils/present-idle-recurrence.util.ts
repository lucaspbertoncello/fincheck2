import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { IdleRecurrenceData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import type { RowContext } from '#/features/recurrences/recurrence-list/types/row-context.type.ts';
import { describeDateRule } from '#/features/recurrences/recurrence-list/utils/describe-date-rule.util.ts';
import { recognizeService } from '#/domain/recurrences/service-logo/rules/recognize-service.rule.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

function formatStartsMonth(month: string): string {
  const [year = '', monthNumber = ''] = month.split('-');
  return `${monthNumber}/${year}`;
}

/** A recurrence with no occurrence in the month: paused, or starting later. */
export function presentIdleRecurrence(
  recurrence: Recurrence.Dto,
  context: RowContext,
): IdleRecurrenceData {
  const paused = recurrence.pausedAt !== null;
  const categoryIcon = recurrence.categoryId
    ? context.categoryIcons.get(recurrence.categoryId)
    : undefined;

  return {
    recurrenceId: recurrence.id,
    name: recurrence.name,
    icon: mapCategoryIcon(categoryIcon, 'repeat'),
    service: recognizeService(recurrence.name, recurrence.matchText),
    flow: recurrence.kind,
    rule: describeDateRule(recurrence.dateRule, recurrence.maxPayments),
    note: paused ? 'Pausada' : `Começa em ${formatStartsMonth(recurrence.startsMonth)}`,
    paused,
    pending: context.pendingKey === recurrence.id,
  };
}
