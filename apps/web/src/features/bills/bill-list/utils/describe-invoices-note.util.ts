import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

/** "Bradesco vence 28/10, Nubank vence 06/11" from the open invoices. */
export function describeInvoicesNote(invoices: readonly Agenda.Item[]): string {
  return invoices
    .flatMap((item) =>
      item.dueOn
        ? [`${item.title.replace(/^Fatura /, '')} vence ${formatDayMonth(item.dueOn)}`]
        : [],
    )
    .join(', ');
}
