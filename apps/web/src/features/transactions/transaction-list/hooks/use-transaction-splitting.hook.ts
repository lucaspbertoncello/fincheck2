import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { SplitPart } from '@fincheck/ui';
import { useRef, useState } from 'react';

import { balanceSplitParts } from '#/domain/transactions/transaction-split/rules/balance-split-parts.rule.ts';
import { checkSplit } from '#/domain/transactions/transaction-split/rules/check-split.rule.ts';
import { distributeCents } from '#/domain/transactions/transaction-split/rules/distribute-cents.rule.ts';
import { getSplitPartCategoryKind } from '#/domain/transactions/transaction-split/rules/get-split-part-category-kind.rule.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { buildCategoryOptions } from '#/shared/utils/transactions/build-category-options.util.ts';
import { describeTransactionError } from '#/shared/utils/transactions/describe-transaction-error.util.ts';

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

  const amounts = parts.map((part) => part.amountCents);
  const change = (next: SplitPart[]) => setDraft({ id: transaction.id, parts: next });

  return {
    transactionId: transaction.id,
    totalCents: total,
    kind: transaction.amountCents > 0 ? ('income' as const) : ('expense' as const),
    parts,
    check: checkSplit(total, amounts),
    changeAmount: (index: number, amountCents: number) => {
      const balanced = balanceSplitParts(total, amounts, index, amountCents);
      change(parts.map((part, position) => ({ ...part, amountCents: balanced[position] ?? 0 })));
    },
    changeCategory: (index: number, categoryId: string | null) =>
      change(parts.map((part, position) => (position === index ? { ...part, categoryId } : part))),
    evenSplit: () => {
      const even = distributeCents(total, parts.length);
      change(parts.map((part, position) => ({ ...part, amountCents: even[position] ?? 0 })));
    },
    // The parts take the kind of the nature (a refund on a card is an expense), not the sign.
    categories: buildCategoryOptions(
      [...lookups.categories.values()],
      getSplitPartCategoryKind(transaction.nature) ?? 'expense',
    ),
    createPartId: () => `new-part-${(nextPartId.current += 1)}`,
    description: `${transaction.description}: reparta o valor entre duas categorias.`,
    saving: model.splitTransaction.isPending,
    error,
    isSplit: transaction.splits.length > 0,
    confirm,
  };
}
