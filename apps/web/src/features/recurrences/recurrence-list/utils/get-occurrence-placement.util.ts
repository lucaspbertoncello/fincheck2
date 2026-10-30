import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { DayMarkerStatus } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type Placement = { date: string | null; marker: DayMarkerStatus };

/**
 * Where an occurrence sits on the month strip and with which marker. What happened sits on the
 * day of the last payment; the rest on the expected day. Dismissed ones are not on the strip, and
 * the ones without a day (or from another month) have `date: null`.
 */
export function getOccurrencePlacement(occurrence: Occurrence.Dto): Placement | null {
  if (occurrence.status === 'skipped') return null;

  const lastPayment = occurrence.payments.at(-1);
  const date =
    occurrence.status === 'confirmed'
      ? (lastPayment?.occurredOn ?? occurrence.expectedOn)
      : occurrence.expectedOn;
  const inMonth = date !== null && date.startsWith(occurrence.month) ? date : null;

  switch (occurrence.status) {
    case 'confirmed':
      return {
        date: inMonth,
        marker: occurrence.difference?.decision === null ? 'different' : 'happened',
      };
    case 'late':
      return { date: inMonth, marker: 'late' };
    case 'partial':
      return { date: inMonth, marker: 'partial' };
    case 'expected':
      return { date: inMonth, marker: 'expected' };
  }
}
