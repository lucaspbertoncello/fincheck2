import type { SummaryBarSegment } from '@fincheck/ui';

import { toPercent } from '#/domain/dashboard/month-summary/rules/to-percent.rule.ts';

/** Income bar: what was received over what is expected for the month. */
export function buildIncomeBar(receivedCents: number, expectedCents: number): SummaryBarSegment[] {
  return [{ percent: toPercent(receivedCents, expectedCents), tone: 'gain' }];
}
