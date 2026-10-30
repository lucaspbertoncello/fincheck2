import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/clock.constant.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';

// One invoice per active card: the oldest one not paid (closed, partial, overdue) if there is one,
// otherwise the open one. Ordered by due date.
export function listOpenInvoices(database: MockState.Database): Invoice.Dto[] {
  const result: Invoice.Dto[] = [];

  for (const account of database.accounts) {
    if (account.type !== 'credit_card' || account.archivedAt || !account.creditCard) continue;
    const openMonth = openMonthFor(account.creditCard, TODAY);

    let chosen: Invoice.Dto | null = null;
    for (let back = 3; back >= 1 && !chosen; back -= 1) {
      const invoice = computeInvoice(database, account.id, addMonths(openMonth, -back)).dto;
      if (['closed', 'partial', 'overdue'].includes(invoice.status)) chosen = invoice;
    }
    result.push(chosen ?? computeInvoice(database, account.id, openMonth).dto);
  }

  return result.sort(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || a.accountId.localeCompare(b.accountId),
  );
}
