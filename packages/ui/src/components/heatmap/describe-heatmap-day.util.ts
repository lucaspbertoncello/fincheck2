import { formatHeatmapDay } from '#/components/heatmap/format-heatmap-day.util.ts';
import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';

/**
 * The name of a cell for a screen reader, value first and date after (the GitHub discussion on long
 * cell names): "R$ 245,90, terça-feira, 12 de março" or "Sem gastos, terça-feira, 12 de março".
 * Hidden values keep the shape and drop the digits.
 */
export function describeHeatmapDay(date: string, totalCents: number, hidden: boolean): string {
  if (totalCents <= 0) return `Sem gastos, ${formatHeatmapDay(date)}`;
  const value = `R$ ${formatMoneyParts(totalCents)}`;
  return `${hidden ? maskMoneyText(value) : value}, ${formatHeatmapDay(date)}`;
}
