import type { SummaryBarSegment } from '@fincheck/ui';

import { toPercent } from '#/domain/dashboard/month-summary/rules/to-percent.rule.ts';

/** Result bar: expenses (gray) and what is left (green) over what was received; all red when overspent. */
export function buildResultBar(receivedCents: number, spentCents: number): SummaryBarSegment[] {
  if (spentCents > receivedCents) return [{ percent: 100, tone: 'loss' }];

  const segments: SummaryBarSegment[] = [
    { percent: toPercent(spentCents, receivedCents), tone: 'muted' },
    { percent: toPercent(receivedCents - spentCents, receivedCents), tone: 'gain' },
  ];
  return segments.filter((segment) => segment.percent > 0);
}
