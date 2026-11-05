import { PERIOD_PAGE_SIZE } from '#/features/transactions/transaction-list/constants/period-options.constant.ts';
import type { PeriodRange } from '#/features/transactions/transaction-list/types/period-range.type.ts';
import type { TransactionListSearch } from '#/features/transactions/transaction-list/schemas/transaction-list-search.schema.ts';
import { buildFilters } from '#/features/transactions/transaction-list/utils/build-filters.util.ts';

/**
 * The query for a wider period, read page by page: the range (none for "Tudo", which is all the
 * history), the page size and the filters in the URL. The cursor is added by each request.
 */
export function buildPeriodListQuery(range: PeriodRange, search: TransactionListSearch) {
  return { ...range, limit: PERIOD_PAGE_SIZE, ...buildFilters(search) };
}
