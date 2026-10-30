import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// What tying a transaction to a bill does to the transaction (bills.md, "Efeitos nas transações"):
// what a friend pays back to me is not income; what I pay back is a normal expense; a general bill
// leaves the transaction as it is, with the bill's category when it had none.
export function applyBillPaymentEffect(
  bill: MockState.BillRecord,
  tx: MockState.TransactionRecord,
  remainingCents: number,
): void {
  if (bill.kind === 'friend' && bill.direction === 'receivable') {
    tx.natureSetBy = 'user';
    tx.categoryId = null;
    tx.categorySource = null;
    tx.categoryRuleId = null;
    if (Math.abs(tx.amountCents) > remainingCents) {
      // More came in than was owed: what was owed is the reimbursement, the rest stays income.
      tx.splits = [
        {
          id: newId(),
          position: 1,
          amountCents: remainingCents,
          nature: 'reimbursed',
          categoryId: null,
          description: bill.counterparty,
        },
        {
          id: newId(),
          position: 2,
          amountCents: Math.abs(tx.amountCents) - remainingCents,
          nature: 'income',
          categoryId: null,
          description: null,
        },
      ];
    } else {
      tx.nature = 'reimbursed';
    }

    return;
  }

  if (tx.categoryId === null && tx.splits.length === 0 && bill.categoryId) {
    tx.categoryId = bill.categoryId;
    tx.categorySource = 'bill';
  }
}
