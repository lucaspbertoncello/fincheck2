import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { NO_CATEGORY_KEY } from '#/features/invoices/invoice-page/constants/no-category-key.constant.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import type { InvoiceCategoryRowData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** The composition of the invoice as rows (`categoryBreakdown` arrives ordered by value). */
export function buildInvoiceCategoryRows(
  breakdown: readonly Invoice.CategoryShare[],
  categories: readonly Category.Dto[],
  selectedKey: string | null,
): InvoiceCategoryRowData[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  return breakdown.map((share) => {
    const key = share.categoryId ?? NO_CATEGORY_KEY;
    const category = share.categoryId ? byId.get(share.categoryId) : undefined;
    const rounded = Math.round(share.sharePercent);

    return {
      key,
      name: share.categoryId ? (category?.name ?? 'Categoria') : 'Sem categoria',
      icon: mapCategoryIcon(category?.icon, 'tag'),
      totalCents: share.totalCents,
      share: share.sharePercent,
      shareLabel: rounded === 0 ? '<1%' : `${percentFormat.format(rounded)}%`,
      countLabel: share.itemCount === 1 ? '1 lançamento' : `${share.itemCount} lançamentos`,
      selected: selectedKey === key,
    };
  });
}
