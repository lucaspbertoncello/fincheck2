import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';

/** Integer cents to the text of a money field: 123456 -> "1.234,56"; zero is empty. */
export function formatCentsInput(cents: number): string {
  return cents > 0 ? formatMoneyParts(cents) : '';
}
