import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';

/** How many filters of the "Filtros" panel are on (the type has its own control). */
export function countActiveFilters(search: TransactionListSearch): number {
  return [search.account, search.category, search.tag, search.uncategorized, search.ruleId].filter(
    Boolean,
  ).length;
}
