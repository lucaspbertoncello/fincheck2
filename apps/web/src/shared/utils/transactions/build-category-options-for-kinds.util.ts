import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryOption } from '@fincheck/ui';

import {
  CREDIT_CATEGORY_GROUP_LABELS,
  TRANSFER_CATEGORY_GROUP_LABEL,
} from '#/shared/constants/transactions/credit-category-groups.constant.ts';
import { buildCategoryOptions } from '#/shared/utils/transactions/build-category-options.util.ts';

/**
 * The options for the kinds a transaction takes (`getAcceptedCategoryKinds`). One kind is the flat
 * list of `buildCategoryOptions`; two (a credit on a card) are one list in two groups, in the order
 * of `kinds`, and the category that is a transfer ("Rotação entre contas") goes last, in a group of
 * its own with no hint, since it is not what either of the two groups says.
 */
export function buildCategoryOptionsForKinds(
  categories: readonly Category.Dto[],
  kinds: readonly Category.Dto['kind'][],
  options: { withTransfer?: boolean } = {},
): CategoryOption[] {
  const [only] = kinds;
  if (kinds.length === 0 || only === undefined) return [];
  if (kinds.length === 1) return buildCategoryOptions(categories, only, options);

  const isTransfer = (id: string) => categories.find((category) => category.id === id)?.isTransfer;
  const ofKinds = kinds.flatMap((kind) =>
    buildCategoryOptions(categories, kind)
      .filter((option) => !isTransfer(option.id))
      .map((option) => ({ ...option, group: CREDIT_CATEGORY_GROUP_LABELS[kind] })),
  );
  // Of the two kinds one is the transfer's own, so it shows whether or not `withTransfer` is set.
  const transfers = buildCategoryOptions(
    categories.filter((category) => category.isTransfer),
    only,
    { withTransfer: true },
  ).map((option) => ({ ...option, group: TRANSFER_CATEGORY_GROUP_LABEL }));

  return [...ofKinds, ...transfers];
}
