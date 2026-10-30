import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';

/** "R$ 1.234,56" for text that cannot use the Money component (tooltips, tables). */
export function formatChartMoney(cents: number, hidden: boolean): string {
  return hidden ? 'R$ ••••' : `${cents < 0 ? '−' : ''}R$ ${formatMoneyParts(cents)}`;
}

/** The same amount for a screen reader: the hidden state never leaks the number. */
export function formatChartMoneyForReader(cents: number, hidden: boolean): string {
  return hidden ? 'valor oculto' : formatChartMoney(cents, false);
}
