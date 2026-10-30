import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import { presentBill } from '#mocks/bills/bill/present-bill.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

// The transaction that most likely paid a bill and still has no link (the "pago, falta vincular"
// seal): exact value (R$ 1,00 apart at most), right direction, between the creation and five days
// after the due date, with the sender matching when the bill names a person, and the only one.
// More than one is only a suggestion and returns null here.
export function findPresumedBillPayment(
  database: MockState.Database,
  record: MockState.BillRecord,
): MockState.TransactionRecord | null {
  const bill = presentBill(database, record);
  if (bill.status === 'settled' || record.dueOn === null) return null;

  const from = record.createdAt.slice(0, 10);
  const until = addDays(record.dueOn, 5);
  const person = record.counterparty ? normalizeText(record.counterparty) : null;

  const candidates = database.transactions.filter((tx) => {
    if (!countsInAccounts(tx) || isTransactionLinked(database, tx.id)) return false;
    if (record.dismissedTransactionIds.includes(tx.id)) return false;
    const rightWay =
      record.direction === 'payable'
        ? tx.amountCents < 0 && tx.nature === 'expense'
        : tx.amountCents > 0 && tx.nature === 'income';
    if (!rightWay) return false;
    if (tx.occurredOn < from || tx.occurredOn > until) return false;
    if (Math.abs(Math.abs(tx.amountCents) - bill.remainingCents) > 100) return false;
    if (person) {
      const text = normalizeText(
        `${tx.bank?.counterparty ?? ''} ${tx.bank?.description ?? ''} ${tx.description}`,
      );
      if (!text.includes(person)) return false;
    }

    return true;
  });

  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}
