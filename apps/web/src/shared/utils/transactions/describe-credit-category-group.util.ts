import { CREDIT_CATEGORY_GROUP_HINTS } from '#/shared/constants/transactions/credit-category-groups.constant.ts';

/** "Abate gasto: O crédito reduz…": the line that says what a group of a credit's categories does. */
export function describeCreditCategoryGroup(group: string | undefined): string | undefined {
  const hint = group ? CREDIT_CATEGORY_GROUP_HINTS[group] : undefined;

  return group && hint ? `${group}: ${hint}` : undefined;
}
