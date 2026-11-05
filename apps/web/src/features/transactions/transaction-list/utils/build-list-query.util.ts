import { PERIOD_PAGE_SIZE } from '#/features/transactions/transaction-list/constants/period-options.constant.ts';
import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/utils/resolve-period-range.util.ts';

const DIRECTION_BY_TYPE = { all: undefined, expense: 'out', income: 'in' } as const;

/** The filters of the URL as `GET /transactions` takes them, whatever the period. */
function buildFilters(search: TransactionListSearch) {
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

/** The `GET /transactions` query for a month and the filters in the URL. */
export function buildListQuery(month: string, search: TransactionListSearch) {
  return { month, ...buildFilters(search) };
}

/**
 * The query for a wider period, read page by page: the range (none for "Tudo", which is all the
 * history), the page size and the filters in the URL. The cursor is added by each request.
 */
export function buildPeriodListQuery(range: PeriodRange, search: TransactionListSearch) {
  return { ...range, limit: PERIOD_PAGE_SIZE, ...buildFilters(search) };
}

/** How many filters of the "Filtros" panel are on (the type has its own control). */
export function countActiveFilters(search: TransactionListSearch): number {
  return [search.account, search.category, search.tag, search.uncategorized, search.ruleId].filter(
    Boolean,
  ).length;
}
