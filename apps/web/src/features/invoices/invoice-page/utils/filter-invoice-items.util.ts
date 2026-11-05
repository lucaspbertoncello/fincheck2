import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { NO_CATEGORY_KEY } from '#/features/invoices/invoice-page/constants/no-category-key.constant.ts';
import { normalizeSearchText } from '#/features/transactions/transaction-list/utils/normalize-search-text.util.ts';

type Filters = {
  /** A category id, `none` or null (no category filter). */
  categoryKey: string | null;
  searchText: string;
};

/**
 * The items that pass the category the person tapped and the text of the search. An expected
 * recurrence has no category in the invoice, so it leaves when a category is chosen.
 */
export function filterInvoiceItems(
  items: readonly Invoice.Item[],
  { categoryKey, searchText }: Filters,
): Invoice.Item[] {
  const needle = normalizeSearchText(searchText);

  return items.filter((item) => {
    if (categoryKey !== null) {
      if (item.type !== 'transaction') return false;
      if ((item.categoryId ?? NO_CATEGORY_KEY) !== categoryKey) return false;
    }
    if (needle === '') return true;
    const name = item.type === 'transaction' ? item.description : item.recurrenceName;

    return normalizeSearchText(name).includes(needle);
  });
}
