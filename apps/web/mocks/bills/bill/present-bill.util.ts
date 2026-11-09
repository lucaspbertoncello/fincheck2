import type { BillPayment } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

const COUNTABLE_NATURES = new Set(['expense', 'income', 'reimbursed']);

// The contract's Bill.Dto. A payment tied to a transaction is worth what the transaction is worth
// now, and only while it counts and keeps a nature that enters the accounts; a hand-made payment is
// worth what was written. The payments come in the order `paidOn`, then creation (the order they
// were recorded in), and each one is cut to what the bill still misses (`amount - accumulated`),
// so what is paid never passes the bill; a line left at zero is out of `payments`.
export function presentBill(database: MockState.Database, record: MockState.BillRecord): Bill.Dto {
  const payments: BillPayment.Dto[] = [];
  let paidCents = 0;

  const ordered = record.payments
    .map((payment, index) => ({ payment, index }))
    .sort((a, b) => a.payment.paidOn.localeCompare(b.payment.paidOn) || a.index - b.index);

  for (const { payment } of ordered) {
    let worth = payment.amountCents;
    let description = payment.description;
    if (payment.transactionId) {
      const tx = database.transactions.find((item) => item.id === payment.transactionId);
      const countable = tx && COUNTABLE_NATURES.has(tx.nature) && countsInAccounts(tx);
      worth = countable ? Math.min(payment.amountCents, Math.abs(tx.amountCents)) : 0;
      description = tx?.description ?? null;
    }
    worth = Math.min(worth, Math.max(0, record.amountCents - paidCents));
    if (worth <= 0) continue;
    payments.push({ ...payment, amountCents: worth, description });
    paidCents += worth;
  }

  let status: Bill.Status = 'open';
  if (paidCents >= record.amountCents) status = 'settled';
  else if (record.dueOn !== null && TODAY > record.dueOn) status = 'overdue';
  else if (paidCents > 0) status = 'partial';

  const origin = record.origin
    ? {
        ...record.origin,
        description:
          database.transactions.find((tx) => tx.id === record.origin?.transactionId)?.description ??
          record.origin.description,
      }
    : null;

  return {
    id: record.id,
    direction: record.direction,
    kind: record.kind,
    description: record.description,
    counterparty: record.counterparty,
    amountCents: record.amountCents,
    paidCents,
    remainingCents: Math.max(0, record.amountCents - paidCents),
    dueOn: record.dueOn,
    categoryId: record.categoryId,
    status,
    origin,
    payments,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
