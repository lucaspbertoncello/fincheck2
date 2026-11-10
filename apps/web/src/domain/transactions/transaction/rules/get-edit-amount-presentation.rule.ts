import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import { getTransactionDirection } from '#/domain/transactions/transaction/rules/get-transaction-direction.rule.ts';

type EditAmountInput = {
  /** The nature picked in the edit form (it may differ from the one saved). */
  nature: 'expense' | 'income' | 'transfer' | 'out_of_account';
  /** Signed, as saved: positive is money in. */
  amountCents: number;
  isCardAccount: boolean;
  /** The kind of the category picked in the form, `null` with none. */
  categoryKind: Category.Dto['kind'] | null;
};

type EditAmountPresentation = {
  sign: '+' | '−';
  tone: 'income' | 'expense';
  /** `abate gasto`: a credit on a card that lowers the spending of an expense category. */
  note: 'abate gasto' | null;
};

/**
 * How the amount of the edit form is drawn: its sign and tone, and the note under it. An ordinary
 * transaction takes them from its nature (a transfer keeps the direction of its value). A credit on
 * a card (a card account, a positive value: a refund) is money coming in whatever its nature says,
 * as the list shows it: "+" in the tone of income. With a category of expense it also says it
 * abates the spending. Presentation only: the nature saved does not change.
 */
export function getEditAmountPresentation(input: EditAmountInput): EditAmountPresentation {
  const isCardCredit = input.isCardAccount && input.amountCents > 0;
  const tone =
    isCardCredit || (input.nature !== 'expense' && input.nature !== 'income')
      ? getTransactionDirection(input.amountCents)
      : input.nature;
  const abates = isCardCredit && input.nature === 'expense' && input.categoryKind === 'expense';

  return { sign: tone === 'income' ? '+' : '−', tone, note: abates ? 'abate gasto' : null };
}
