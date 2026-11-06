import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { formatMoneyNote } from '#/features/recurrences/utils/format-money-note.util.ts';

/** "R$ 3.802,00 já recebidos". */
export function buildIncomeCaption(summary: Recurrence.Summary, hidden: boolean): string {
  return `${formatMoneyNote(summary.incomes.receivedCents, hidden)} já recebidos`;
}
