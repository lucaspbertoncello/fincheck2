import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';

/**
 * "R$ 1.234,56" for text that cannot use the Money component (tooltips, tables). Hidden, the
 * digits become dots and the shape stays ("R$ •.•••,••"), so the tooltip keeps its size.
 */
export function formatChartMoney(cents: number, hidden: boolean): string {
  const text = `${cents < 0 ? '−' : ''}R$ ${formatMoneyParts(cents)}`;
  return hidden ? maskMoneyText(text).replace('−', '') : text;
}

/** The same amount for a screen reader: the hidden state never leaks the number. */
export function formatChartMoneyForReader(cents: number, hidden: boolean): string {
  return hidden ? 'valor oculto' : formatChartMoney(cents, false);
}
