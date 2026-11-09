import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

type CategorizableTransaction = {
  nature: Transaction.Dto['nature'];
  /** Signed: negative is money out. */
  amountCents: number;
  isCardAccount: boolean;
  isSplit: boolean;
};

/**
 * The kinds of category a transaction takes, expense first. Only a whole expense or income takes a
 * category, and it takes the kind of its nature, with one exception: a credit on a card (a card
 * account, a positive value: a refund) takes both. A category of expense abates the spending of
 * that category; one of income turns the credit into income. Either way it still lowers the
 * invoice. A debit on a card, as any other, keeps the kind of its nature.
 */
export function getAcceptedCategoryKinds(
  transaction: CategorizableTransaction,
): readonly Category.Dto['kind'][] {
  if (transaction.isSplit) return [];
  if (transaction.nature !== 'expense' && transaction.nature !== 'income') return [];
  if (transaction.isCardAccount && transaction.amountCents > 0) return ['expense', 'income'];

  return [transaction.nature];
}
