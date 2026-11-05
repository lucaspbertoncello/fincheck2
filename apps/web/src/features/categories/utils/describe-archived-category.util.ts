import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { CATEGORY_KIND_LABELS } from '#/features/categories/constants/category-kind-labels.constant.ts';
import { MONTH_NAMES } from '#/shared/constants/date/month-names.constant.ts';

/** "Despesa · 27 transações · usada até maio" for the archived rows. */
export function describeArchivedCategory(category: Category.Dto): string {
  const count = category.transactionCount;
  const used = category.lastUsedOn
    ? `usada até ${MONTH_NAMES[Number(category.lastUsedOn.slice(5, 7)) - 1] ?? ''}`
    : 'nunca usada';

  return [
    CATEGORY_KIND_LABELS[category.kind],
    `${count} ${count === 1 ? 'transação' : 'transações'}`,
    used,
  ].join(' · ');
}
