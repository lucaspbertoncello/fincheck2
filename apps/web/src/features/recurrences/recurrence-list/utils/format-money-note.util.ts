import { formatMoney } from '#/shared/utils/format-money.util.ts';

/** Money inside a sentence: "R$ 23,90", or "R$ ••••" with the eye on (BR-DSH-013). */
export function formatMoneyNote(cents: number, hidden: boolean): string {
  return hidden ? 'R$ ••••' : formatMoney(cents);
}
