import { maskMoneyText } from '@fincheck/ui';

import { formatMoney } from '#/shared/utils/format-money.util.ts';

/** Money inside a sentence: "R$ 23,90", or "R$ ••,••" with the eye on, same shape (BR-DSH-013). */
export function formatMoneyText(cents: number, hidden: boolean): string {
  const text = formatMoney(cents);

  return hidden ? maskMoneyText(text) : text;
}
