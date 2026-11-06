import type { SummaryBarSegment } from '@fincheck/ui';

import { toPercent } from '#/domain/dashboard/month-summary/rules/to-percent.rule.ts';

/**
 * Expense bar. The gray stretch is the whole previous month; the part of it already spent is
 * darker, and what went past the previous month is red. The scale is whichever is larger.
 */
export function buildExpenseBar(
  spentCents: number,
  previousTotalCents: number,
): SummaryBarSegment[] {
  const scale = Math.max(spentCents, previousTotalCents);
  if (scale <= 0) return [];

  const within = Math.min(spentCents, previousTotalCents);
  const over = Math.max(0, spentCents - previousTotalCents);
  const segments: SummaryBarSegment[] = [
    { percent: toPercent(within, scale), tone: 'strong' },
    { percent: toPercent(previousTotalCents - within, scale), tone: 'muted' },
    { percent: toPercent(over, scale), tone: 'loss' },
  ];
  return segments.filter((segment) => segment.percent > 0);
}
