import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';

const DIRECTION_BY_TYPE = { all: undefined, expense: 'out', income: 'in' } as const;

/** The `GET /transactions` query for a month and the filters in the URL. */
export function buildListQuery(month: string, search: TransactionListSearch) {
  return {
    month,
    direction: DIRECTION_BY_TYPE[search.type],
    search: search.q,
    accountId: search.account,
    // The contract does not combine a category with "sem categoria": the category wins.
    categoryId: search.category,
    uncategorized: search.category ? undefined : search.uncategorized,
    tagId: search.tag,
    ruleId: search.ruleId,
  };
}

/** How many filters of the "Filtros" panel are on (the type has its own control). */
export function countActiveFilters(search: TransactionListSearch): number {
  return [search.account, search.category, search.tag, search.uncategorized, search.ruleId].filter(
    Boolean,
  ).length;
}
