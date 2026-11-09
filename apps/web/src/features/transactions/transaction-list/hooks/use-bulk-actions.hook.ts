import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useToast, type SelectionAction } from '@fincheck/ui';
import { useState } from 'react';

import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { getAcceptedCategoryKinds } from '#/domain/transactions/transaction/rules/get-accepted-category-kinds.rule.ts';
import { getCommonCategoryKinds } from '#/domain/transactions/transaction/rules/get-common-category-kinds.rule.ts';
import { buildCategoryOptionsForKinds } from '#/shared/utils/transactions/build-category-options-for-kinds.util.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

type BulkArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  selectedIds: ReadonlySet<string>;
  transactions: readonly Transaction.Dto[];
  /** Leaves the selection mode once an action went through. */
  finish: () => void;
  askRule: (ids: string[]) => void;
  reportError: (error: unknown) => void;
};

type Picker = 'category' | 'tag';

/**
 * Bulk actions of the selection mode (RF-CAT-007): "Ignorar" goes straight through; "Categorizar" and
 * "Tag" first open a picker. Each one ends with "Desfazer", built from the `previous` the API returns,
 * and a categorization asks about a rule afterwards.
 */
export function useBulkActions({
  model,
  lookups,
  selectedIds,
  transactions,
  finish,
  askRule,
  reportError,
}: BulkArgs) {
  const { showUndoToast } = useToast();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const ids = [...selectedIds];
  const selected = transactions.filter((transaction) => selectedIds.has(transaction.id));
  const categories = [...lookups.categories.values()];
  // Only what fits every selected transaction: a bulk categorization never offers a category some
  // of them would refuse (a credit on a card takes both kinds; the rest, the kind of their nature).
  const categorizable = selected.map((transaction) => ({
    nature: transaction.nature,
    amountCents: transaction.amountCents,
    isCardAccount: lookups.accounts.get(transaction.accountId)?.type === 'credit_card',
    isSplit: transaction.splits.length > 0,
  }));
  const kinds = getCommonCategoryKinds(categorizable);
  // Why there is nothing to offer: no selected transaction takes a category at all, or the ones
  // that do take different kinds.
  const takesNone = categorizable.every((item) => getAcceptedCategoryKinds(item).length === 0);

  function close() {
    setPicker(null);
    setCategoryId(null);
    setTagId(null);
  }

  async function run(
    action: Parameters<TransactionListModel['bulkTransactions']['mutateAsync']>[0]['action'],
    describe: (updated: number) => string,
    afterwards?: () => void,
  ) {
    try {
      const result = await model.bulkTransactions.mutateAsync({ transactionIds: ids, action });
      const skipped = result.skipped.length;
      const note = skipped > 0 ? ` ${countWord(skipped, 'ficou', 'ficaram')} como estava.` : '';
      showUndoToast({
        message: `${describe(result.updatedCount)}${note}`,
        onUndo: () => model.restoreBulk.mutate({ items: result.previous }),
      });
      afterwards?.();
      close();
      finish();
    } catch (error) {
      reportError(error);
    }
  }

  function onAction(action: SelectionAction) {
    if (ids.length === 0) return;
    if (action === 'ignore') {
      void run(
        { type: 'ignore' },
        (updated) => `${countWord(updated, 'transação ignorada', 'transações ignoradas')}.`,
      );
      return;
    }
    setPicker(action === 'categorize' ? 'category' : 'tag');
  }

  function apply() {
    if (picker === 'category' && categoryId) {
      const name = lookups.categories.get(categoryId)?.name ?? 'a categoria';
      void run(
        { type: 'categorize', categoryId },
        (updated) => `${countWord(updated, 'transação foi', 'transações foram')} para ${name}.`,
        () => askRule(ids),
      );
    }
    if (picker === 'tag' && tagId) {
      const name = lookups.tags.get(tagId)?.name ?? '';
      void run(
        { type: 'addTag', tagId },
        (updated) => `Tag #${name} em ${countWord(updated, 'transação', 'transações')}.`,
      );
    }
  }

  return {
    picker,
    close,
    onAction,
    apply,
    categoryId,
    setCategoryId,
    tagId,
    setTagId,
    pending: model.bulkTransactions.isPending,
    categories: buildCategoryOptionsForKinds(categories, kinds),
    noCategoryReason:
      kinds.length > 0 ? null : takesNone ? ('none-takes' as const) : ('mixed' as const),
    tags: [...lookups.tags.values()].filter((tag) => tag.archivedAt === null),
  };
}
