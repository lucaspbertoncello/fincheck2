import type { BillPayment } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// The contract's Bill.Dto. A payment tied to a transaction is worth what the transaction is worth
// now, and only while it counts; a hand-made payment is worth what was written.
export function presentBill(database: MockState.Database, record: MockState.BillRecord): Bill.Dto {
  const payments: BillPayment.Dto[] = [];
  let paidCents = 0;

  for (const payment of [...record.payments].sort((a, b) => a.paidOn.localeCompare(b.paidOn))) {
    if (!payment.transactionId) {
      payments.push(payment);
      paidCents += payment.amountCents;
      continue;
    }
    const tx = database.transactions.find((item) => item.id === payment.transactionId);
    if (!tx || !countsInAccounts(tx)) continue;
    const worth = Math.min(payment.amountCents, Math.abs(tx.amountCents));
    payments.push({ ...payment, amountCents: worth, description: tx.description });
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
