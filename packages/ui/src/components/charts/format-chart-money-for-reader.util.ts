import { formatChartMoney } from '#/components/charts/format-chart-money.util.ts';

/** The same amount for a screen reader: the hidden state never leaks the number. */
export function formatChartMoneyForReader(cents: number, hidden: boolean): string {
  return hidden ? 'valor oculto' : formatChartMoney(cents, false);
}
