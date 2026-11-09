import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// A single payment may fall this far short of the expected amount (15%, decision R5) and still
// confirm the occurrence, with the difference left for Lucas to answer.
const SINGLE_PAYMENT_FLOOR_PERCENT = 85;

// The state of an occurrence, derived and never stored (`recurrences.md`, "Valor recebido, estado
// e diferença"). The first condition that holds wins, in this order: skipped, confirmed (marked by
// hand, or received at least the expected amount, or one payment of at least 85% of it), late
// (today is after the window, even with a partial payment, decision R4), partial, expected.
// Integer cents only: the 85% is `received x 100 >= expected x 85`, no float.
//
// Received is always the real total, never cut at the expected amount. A recurrence that takes "as
// many as come" (`acceptsExcess`) has no difference to answer when more than expected arrives: the
// excess is just received over (`receivedCents` above the expected, nothing left, confirmed).
export function computeOccurrenceState(input: {
  expectedCents: number;
  // What each payment that counts is worth now. Payments of a transaction that does not count are
  // not in the list.
  paymentCents: readonly number[];
  settled: boolean;
  skipped: boolean;
  windowEndOn: BusinessDate;
  today: BusinessDate;
  differenceDecision: Occurrence.Decision | null;
  amountMode: Recurrence.AmountMode;
  // The recurrence has no limit of payments in the month (`maxPayments` null).
  acceptsExcess: boolean;
}): OccurrenceState {
  const expected = input.expectedCents;
  const received = input.paymentCents.reduce((sum, cents) => sum + cents, 0);

  let status: Occurrence.Status;
  if (input.skipped) status = 'skipped';
  else if (
    input.settled ||
    received >= expected ||
    (input.paymentCents.length === 1 && received * 100 >= expected * SINGLE_PAYMENT_FLOOR_PERCENT)
  ) {
    status = 'confirmed';
  } else if (input.today.value > input.windowEndOn.value) status = 'late';
  else if (received > 0) status = 'partial';
  else status = 'expected';

  // A manual mark is no money received, so there is nothing to compare: no difference.
  const isExcessAccepted = input.acceptsExcess === true && received > expected;
  const hasDifference =
    status === 'confirmed' && !input.settled && received !== expected && !isExcessAccepted;
  const difference: Occurrence.Difference | null = hasDifference
    ? {
        amountCents: received - expected,
        // A source that follows the last amount received answers by itself (BR-REC-014).
        decision: input.amountMode === 'last_received' ? 'updated' : input.differenceDecision,
      }
    : null;

  return {
    status,
    receivedCents: received,
    remainingCents:
      status === 'confirmed' || status === 'skipped' ? 0 : Math.max(0, expected - received),
    difference,
    needsAttention: status === 'late' || (difference !== null && difference.decision === null),
  };
}

export type OccurrenceState = {
  status: Occurrence.Status;
  receivedCents: number;
  remainingCents: number;
  difference: Occurrence.Difference | null;
  needsAttention: boolean;
};
