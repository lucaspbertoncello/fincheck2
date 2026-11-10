import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

/**
 * The two groups a credit on a card (a refund) picks its category from. The heading says what the
 * category does to the credit; the hint, under it, says the part that stays the same.
 */
export const CREDIT_CATEGORY_GROUP_LABELS: Readonly<Record<Category.Dto['kind'], string>> = {
  expense: 'Abate gasto',
  income: 'Conta como receita',
};

/** The short note under the amount of a credit on a card whose category is of expense. */
export const CREDIT_AMOUNT_NOTE = `${CREDIT_CATEGORY_GROUP_LABELS.expense} da categoria`;

/**
 * The group of the category that is a transfer ("Rotação entre contas") on a credit: it is neither
 * of the two above and has no hint, since it does neither of the things they say.
 */
export const TRANSFER_CATEGORY_GROUP_LABEL = 'Transferência';

/** The hint under each group heading, by the heading. */
export const CREDIT_CATEGORY_GROUP_HINTS: Readonly<Record<string, string>> = {
  [CREDIT_CATEGORY_GROUP_LABELS.expense]: 'O crédito reduz o gasto da categoria e a fatura.',
  [CREDIT_CATEGORY_GROUP_LABELS.income]: 'O crédito vira receita do mês e também reduz a fatura.',
};

/** What the modal of a new category says on a credit on a card: the two kinds do different things. */
export const CREDIT_NEW_CATEGORY_NOTE = `No crédito do cartão, a categoria de despesa abate o gasto e a de receita conta como receita do mês.`;
