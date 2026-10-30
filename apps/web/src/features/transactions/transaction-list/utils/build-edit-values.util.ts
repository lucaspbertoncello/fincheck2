import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionEditValues } from '@fincheck/ui';

import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';

/** The values the edit panel starts with. A nature outside expense, income and transfer shows as "Fora da conta". */
export function buildEditValues(
  transaction: Transaction.Dto,
  lookups: TransactionLookups,
): TransactionEditValues {
  const { nature } = transaction;
  const editable = nature === 'expense' || nature === 'income' || nature === 'transfer';

  return {
    description: transaction.description,
    amountCents: Math.abs(transaction.amountCents),
    date: transaction.occurredOn,
    categoryId: transaction.categoryId,
    tags: transaction.tagIds
      .map((id) => lookups.tags.get(id)?.name)
      .filter((name): name is string => Boolean(name)),
    nature: editable ? nature : 'out_of_account',
    counterpartId: transaction.transferCounterpartId,
  };
}
