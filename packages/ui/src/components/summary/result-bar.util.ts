import type { SummaryBarSegment } from '#/components/summary/summary-bar-segment.type.ts';
import { toPercent } from '#/components/summary/to-percent.util.ts';

/** Result bar: expenses (gray) and what is left (green) over what was received; all red when overspent. */
export function resultBar(receivedCents: number, spentCents: number): SummaryBarSegment[] {
  if (spentCents > receivedCents) return [{ percent: 100, tone: 'loss' }];

  const segments: SummaryBarSegment[] = [
    { percent: toPercent(spentCents, receivedCents), tone: 'muted' },
    { percent: toPercent(receivedCents - spentCents, receivedCents), tone: 'gain' },
  ];
  return segments.filter((segment) => segment.percent > 0);
}
