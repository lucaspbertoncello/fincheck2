import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { MonthBar } from '@fincheck/ui';

import { countWord } from '#/shared/utils/text/count-word.util.ts';

const SHORT_MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const LONG_MONTH = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function monthDate(month: string): Date {
  const [year = 0, number = 1] = month.split('-').map(Number);

  return new Date(Date.UTC(year, number - 1, 1));
}

/** "nov", without the dot some locales add to the short month. */
function shortLabel(month: string): string {
  return SHORT_MONTH.format(monthDate(month)).replace('.', '');
}

/** The 12 months of the trend as bars: "nov" under the bar, "novembro de 2025" and the count in the tip. */
export function buildTrendBars(months: readonly CategoryBreakdown.TrendMonth[]): MonthBar[] {
  return months.map((item) => ({
    key: item.month,
    label: shortLabel(item.month),
    fullLabel: LONG_MONTH.format(monthDate(item.month)),
    cents: item.totalCents,
    detail: countWord(item.transactionCount, 'transação', 'transações'),
  }));
}
