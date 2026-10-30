import { closesOnFor } from '#mocks/invoices/invoice/closes-on-for.util.ts';
import { dueOnFor } from '#mocks/invoices/invoice/due-on-for.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// The stored row of an invoice, created on the first write with the card's current days.
export function ensureInvoiceRow(
  database: MockState.Database,
  accountId: string,
  month: string,
): MockState.InvoiceRecord {
  const existing = database.invoices.find(
    (item) => item.accountId === accountId && item.month === month,
  );
  if (existing) return existing;

  const account = database.accounts.find(
    (item) => item.id === accountId && item.type === 'credit_card',
  );
  if (!account?.creditCard) fail(404, 'CARD_NOT_FOUND', 'A conta não existe ou não é cartão');

  const row: MockState.InvoiceRecord = {
    accountId,
    month,
    closesOn: closesOnFor(account.creditCard, month),
    dueOn: dueOnFor(account.creditCard, month),
    bankTotalCents: null,
    totalOverrideCents: null,
    overrideNote: null,
    payments: [],
    dismissedTransactionIds: [],
  };
  database.invoices.push(row);

  return row;
}
