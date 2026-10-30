import type { MockState } from '#mocks/state/mock-state.type.ts';

// Undoes `applyBillPaymentEffect`: a reimbursement goes back to income; a category the bill put is
// taken off; what I paid back to a friend stays an expense.
export function undoBillPaymentEffect(tx: MockState.TransactionRecord): void {
  if (tx.nature === 'reimbursed') {
    tx.nature = 'income';
    tx.natureSetBy = 'system';
  }
  if (tx.splits.some((part) => part.nature === 'reimbursed')) tx.splits = [];
  if (tx.categorySource === 'bill') {
    tx.categoryId = null;
    tx.categorySource = null;
  }
}
