import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

import type { BillTotalModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { plural } from '#/features/bills/bill-list/utils/plural.util.ts';
import { toTotalItems } from '#/features/bills/bill-list/utils/to-total-items.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

/** Card "A pagar": the total is the Livre's (BR-DSH-003); the items are its composition. */
export function buildPayableModel(agenda: Agenda.Dto, endOfMonth: string): BillTotalModel {
  return {
    label: 'A pagar',
    totalCents: agenda.payable.totalCents,
    caption: `${plural(agenda.payable.count, 'conta', 'contas')}, até ${formatDayMonth(endOfMonth)} e faturas abertas`,
    items: toTotalItems(agenda.payable.items),
  };
}
