import { CATEGORY_GROUP_LATEST_COUNT } from '#/features/transactions/transaction-list/constants/category-group-latest-count.constant.ts';
import type { PeriodRange } from '#/shared/types/transactions/period-range.type.ts';

type IncomeLatestArgs = {
  categoryId: string;
  month: string;
  /** The ends of the period when it is wider than the month. */
  range: PeriodRange;
  isMonth: boolean;
};

/**
 * The `GET /transactions` query for the last incomes of a category in the period: the month has no
 * page size (the groups keep the newest few), a wider period asks for the first page of just that
 * many, newest first.
 */
export function buildIncomeLatestQuery({ categoryId, month, range, isMonth }: IncomeLatestArgs) {
  return isMonth
    ? { month, categoryId, direction: 'in' as const }
    : { ...range, limit: CATEGORY_GROUP_LATEST_COUNT, categoryId, direction: 'in' as const };
}
