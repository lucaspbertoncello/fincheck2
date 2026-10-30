import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';

/**
 * Compact projected balance of a day, always with sign and whole reais, no "R$":
 * 409000 -> "+4.090", -128500 -> "−1.285". Zero has no sign. The `Money` component has no
 * compact mode, so the strip formats it here (components.md 4).
 */
export function formatDayTotal(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  return `${sign}${formatMoneyParts(cents, false)}`;
}
