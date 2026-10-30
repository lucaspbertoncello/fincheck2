import type { SummaryBarSegment } from '#/components/month-summary/summary-bar-segment.type.ts';
import { toPercent } from '#/components/month-summary/to-percent.util.ts';

/** Income bar: what was received over what is expected for the month. */
export function incomeBar(receivedCents: number, expectedCents: number): SummaryBarSegment[] {
  return [{ percent: toPercent(receivedCents, expectedCents), tone: 'gain' }];
}
