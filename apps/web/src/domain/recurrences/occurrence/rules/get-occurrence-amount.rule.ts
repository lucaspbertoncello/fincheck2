import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

type OccurrenceAmount = {
  amountCents: number;
  /** The expected amount (the reference value of a variable one); left out while it is the main one. */
  expectedCents?: number;
  /** Something came in and part is still open (partial, or late with a payment). */
  remainingCents?: number;
  /** What came in above the expected amount. */
  excessCents?: number;
};

/**
 * The amounts a card shows. The main one is what already came in; while nothing did it is the
 * expected one, and the card says it is a forecast (pending or late) or repeats it as "≈ ...
 * previstos" (marked as done by hand). A dismissed month shows the expected amount alone. With money
 * in, the expected amount comes along, and so does what is missing and what came above it.
 */
export function getOccurrenceAmount(occurrence: Occurrence.Dto): OccurrenceAmount {
  const { expectedAmountCents: expected, receivedCents: received } = occurrence;
  if (occurrence.status === 'skipped') return { amountCents: expected };
  if (received === 0) {
    return occurrence.status === 'confirmed'
      ? { amountCents: expected, expectedCents: expected }
      : { amountCents: expected };
  }

  const open =
    (occurrence.status === 'partial' || occurrence.status === 'late') &&
    occurrence.remainingCents > 0;

  return {
    amountCents: received,
    expectedCents: expected,
    ...(open ? { remainingCents: occurrence.remainingCents } : {}),
    ...(received > expected ? { excessCents: received - expected } : {}),
  };
}
