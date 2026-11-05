import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

/** The name of the map for a screen reader: "Gasto por dia em outubro de 2026" or "... em 2026". */
export function describeSpendMapPeriod(view: 'month' | 'year', month: string): string {
  if (view === 'year') return `Gasto por dia em ${month.slice(0, 4)}`;
  const { monthLabel, yearLabel } = formatMonthParts(month);

  return `Gasto por dia em ${monthLabel.toLowerCase()} de ${yearLabel}`;
}
