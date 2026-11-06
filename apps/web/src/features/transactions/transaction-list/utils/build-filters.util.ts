import type { TransactionListSearch } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';

const DIRECTION_BY_TYPE = { all: undefined, expense: 'out', income: 'in' } as const;

/** The filters of the URL as `GET /transactions` takes them, whatever the period. */
export function buildFilters(search: TransactionListSearch) {
  return {
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
