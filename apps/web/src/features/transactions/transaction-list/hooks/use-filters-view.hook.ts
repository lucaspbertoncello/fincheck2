import { useState } from 'react';

import type { useTransactionListSearch } from '#/shared/hooks/transactions/use-transaction-list-search.hook.ts';
import type { FiltersView } from '#/shared/types/transactions/transaction-list-view.type.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { buildCategoryOptions } from '#/shared/utils/transactions/build-category-options.util.ts';
import { countActiveFilters } from '#/features/transactions/transaction-list/utils/count-active-filters.util.ts';

type FiltersViewArgs = {
  lookups: TransactionLookups;
  search: ReturnType<typeof useTransactionListSearch>['search'];
  update: ReturnType<typeof useTransactionListSearch>['update'];
};

/** The "Filtros" panel: its open state, the options from the lookups and the URL it writes. */
export function useFiltersView({ lookups, search, update }: FiltersViewArgs) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCategories = [...lookups.categories.values()];

  function clear() {
    update({
      account: null,
      category: null,
      tag: null,
      uncategorized: null,
      ruleId: null,
      recurrence: null,
      q: null,
    });
  }

  const view: FiltersView = {
    isOpen,
    onOpenChange: setIsOpen,
    accounts: [...lookups.accounts.values()]
      .filter((account) => account.archivedAt === null)
      .map((account) => ({ id: account.id, name: account.name })),
    accountId: search.account,
    onAccountChange: (id) => update({ account: id ?? null }),
    categories: [
      ...buildCategoryOptions(activeCategories, 'expense'),
      ...buildCategoryOptions(activeCategories, 'income'),
    ],
    categoryId: search.category,
    onCategoryChange: (id) => update({ category: id ?? null, uncategorized: null }),
    tags: [...lookups.tags.values()]
      .filter((tag) => tag.archivedAt === null)
      .map((tag) => ({ id: tag.id, name: tag.name })),
    tagId: search.tag,
    onTagChange: (id) => update({ tag: id ?? null }),
    uncategorized: search.uncategorized ?? false,
    onUncategorizedChange: (value) => update({ uncategorized: value || null }),
    canClear: countActiveFilters(search) > 0,
    onClear: clear,
  };

  return { view, clear, open: () => setIsOpen(true) };
}
