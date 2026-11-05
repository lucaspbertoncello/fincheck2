import type { SummaryBarSegment } from '#/components/summary/summary-bar-segment.type.ts';
import { toPercent } from '#/components/summary/to-percent.util.ts';

/** Income bar: what was received over what is expected for the month. */
export function incomeBar(receivedCents: number, expectedCents: number): SummaryBarSegment[] {
  return [{ percent: toPercent(receivedCents, expectedCents), tone: 'gain' }];
}
