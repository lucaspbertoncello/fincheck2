import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { distributeCents, type SplitPart } from '@fincheck/ui';
import { useRef, useState } from 'react';

import { getTransactionDirection } from '#/domain/transactions/transaction/rules/get-transaction-direction.rule.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import { buildCategoryOptions } from '#/features/transactions/transaction-list/utils/build-category-options.util.ts';
import { describeTransactionError } from '#/features/transactions/transaction-list/utils/describe-transaction-error.util.ts';

const SPLIT_PARTS = 2;

function initialParts(transaction: Transaction.Dto): SplitPart[] {
  if (transaction.splits.length > 0) {
    return transaction.splits.map((split) => ({
      id: split.id,
      categoryId: split.categoryId,
      amountCents: Math.abs(split.amountCents),
    }));
  }
  return distributeCents(Math.abs(transaction.amountCents), SPLIT_PARTS).map(
    (amountCents, index) => ({
      id: `part-${index + 1}`,
      categoryId: null,
      amountCents,
    }),
  );
}

type SplittingArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  transaction: Transaction.Dto | undefined;
  close: () => void;
};

/**
 * The "Dividir em duas" panel of one transaction (RF-TRX-005). The contract takes exactly two parts
 * for now, so a third part is refused here with a clear message instead of a server error.
 */
export function useTransactionSplitting({ model, lookups, transaction, close }: SplittingArgs) {
  const [draft, setDraft] = useState<{ id: string; parts: SplitPart[] }>();
  const [failure, setFailure] = useState<{ id: string; message: string }>();
  const nextPartId = useRef(0);

  if (!transaction) return null;

  const parts = draft?.id === transaction.id ? draft.parts : initialParts(transaction);
  const error = failure?.id === transaction.id ? failure.message : undefined;
  const total = Math.abs(transaction.amountCents);

  async function confirm() {
    if (!transaction) return;
    if (parts.length !== SPLIT_PARTS) {
      setFailure({
        id: transaction.id,
        message: 'Por enquanto só dá para dividir em duas partes.',
      });
      return;
    }
    try {
      await model.splitTransaction.mutateAsync({
        id: transaction.id,
        body: {
          parts: parts.map((part) => ({
            amountCents: part.amountCents,
            ...(part.categoryId ? { categoryId: part.categoryId } : {}),
          })),
        },
      });
      close();
    } catch (caught) {
      setFailure({ id: transaction.id, message: describeTransactionError(caught).message });
    }
  }

  return {
    transactionId: transaction.id,
    totalCents: total,
    parts,
    onChange: (next: SplitPart[]) => setDraft({ id: transaction.id, parts: next }),
    categories: buildCategoryOptions(
      [...lookups.categories.values()],
      getTransactionDirection(transaction.amountCents),
    ),
    createPartId: () => `new-part-${(nextPartId.current += 1)}`,
    description: `${transaction.description}: reparta o valor entre duas categorias.`,
    saving: model.splitTransaction.isPending,
    error,
    isSplit: transaction.splits.length > 0,
    confirm,
  };
}
