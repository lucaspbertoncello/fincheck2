import type { TransactionListSearch } from '#/shared/schemas/transactions/transaction-list-search.schema.ts';
import { buildFilters } from '#/features/transactions/transaction-list/utils/build-filters.util.ts';

/** The `GET /transactions` query for a month and the filters in the URL. */
export function buildListQuery(month: string, search: TransactionListSearch) {
  return { month, ...buildFilters(search) };
}
