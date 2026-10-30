import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import type { RowContext } from '#/features/recurrences/recurrence-list/types/row-context.type.ts';
import { buildOccurrenceStatusNote } from '#/features/recurrences/recurrence-list/utils/build-occurrence-status-note.util.ts';
import { buildRecurrenceAccountLabel } from '#/features/recurrences/recurrence-list/utils/build-recurrence-account-label.util.ts';
import { describeDateRule } from '#/features/recurrences/recurrence-list/utils/describe-date-rule.util.ts';
import { getOccurrenceAmount } from '#/features/recurrences/recurrence-list/utils/get-occurrence-amount.util.ts';
import { getOccurrenceInlineActions } from '#/features/recurrences/recurrence-list/utils/get-occurrence-inline-actions.util.ts';
import { getOccurrenceRowStatus } from '#/features/recurrences/recurrence-list/utils/get-occurrence-row-status.util.ts';
import { mapCategoryIcon } from '#/features/recurrences/recurrence-list/utils/map-category-icon.util.ts';

/** One occurrence of the month as the data of a `RecurrenceRow`. */
export function presentOccurrenceRow(
  occurrence: Occurrence.Dto,
  context: RowContext,
): OccurrenceRowData {
  const recurrence = context.recurrences.get(occurrence.recurrenceId);
  const accountId = recurrence?.accountId ?? occurrence.accountId;
  const accountName = accountId ? context.accountNames.get(accountId) : undefined;
  const status = getOccurrenceRowStatus(occurrence);
  const categoryIcon = recurrence?.categoryId
    ? context.categoryIcons.get(recurrence.categoryId)
    : undefined;
  const difference =
    status === 'different'
      ? { newCents: occurrence.receivedCents, keptCents: occurrence.expectedAmountCents }
      : undefined;

  return {
    occurrenceId: occurrence.id,
    recurrenceId: occurrence.recurrenceId,
    name: occurrence.recurrenceName,
    icon: mapCategoryIcon(categoryIcon),
    flow: occurrence.kind,
    rule: recurrence ? describeDateRule(recurrence.dateRule, recurrence.maxPayments) : '',
    account: recurrence ? buildRecurrenceAccountLabel(recurrence, accountName) : undefined,
    status,
    statusNote: buildOccurrenceStatusNote(occurrence, context),
    ...getOccurrenceAmount(occurrence),
    inlineActions: getOccurrenceInlineActions(occurrence),
    difference,
    pending: context.pendingKey === occurrence.id || context.pendingKey === occurrence.recurrenceId,
  };
}
