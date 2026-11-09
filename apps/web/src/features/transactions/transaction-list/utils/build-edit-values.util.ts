import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionEditValues } from '@fincheck/ui';

/** The values the edit panel starts with. A nature outside expense, income and transfer shows as "Fora da conta". */
export function buildEditValues(transaction: Transaction.Dto): TransactionEditValues {
  const { nature } = transaction;
  const editable = nature === 'expense' || nature === 'income' || nature === 'transfer';

  return {
    description: transaction.description,
    amountCents: Math.abs(transaction.amountCents),
    date: transaction.occurredOn,
    categoryId: transaction.categoryId,
    tagIds: [...transaction.tagIds],
    nature: editable ? nature : 'out_of_account',
    counterpartId: transaction.transferCounterpartId,
  };
}
