import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

type OccurrenceAmount = { amountCents: number; totalCents?: number };

/** The amount a row shows: what came in when there are payments, otherwise the expected one. */
export function getOccurrenceAmount(occurrence: Occurrence.Dto): OccurrenceAmount {
  if (occurrence.status === 'partial') {
    return { amountCents: occurrence.receivedCents, totalCents: occurrence.expectedAmountCents };
  }
  if (occurrence.status === 'confirmed' && occurrence.receivedCents > 0) {
    return { amountCents: occurrence.receivedCents };
  }

  return { amountCents: occurrence.expectedAmountCents };
}
