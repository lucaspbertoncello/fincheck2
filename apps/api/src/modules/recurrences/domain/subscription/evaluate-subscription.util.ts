import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import { SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS } from '@fincheck/shared/recurrences/subscription/subscription.constant.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

// The state of a subscription in a month and the warning that fits it (BR-REC-017). `charges` are
// the debits that belong to the subscription up to the end of the month, oldest first.
//
// - Ended (paused or deleted): it only has a place in the tab if it charged after it ended; the
//   warning is "cobrou depois de encerrada".
// - Charged: a charge in the month, or the occurrence confirmed. Missed: the occurrence is late, or
//   there is none and the month is past. Otherwise it is still to come.
// - A missed month warns "não cobrou"; otherwise a last charge that differs from the expected
//   amount by more than R$ 0,50 warns that the price changed.
export function evaluateSubscription(input: {
  month: string;
  currentMonth: string;
  expectedCents: number;
  // The business day it ended, if it did.
  endedOn: string | null;
  occurrenceStatus: Occurrence.Status | null;
  charges: readonly { transactionId: string; occurredOn: string; cents: number }[];
}): SubscriptionEvaluation | null {
  const monthCharges = input.charges.filter((charge) => charge.occurredOn.startsWith(input.month));
  const lastCharge = input.charges.at(-1) ?? null;

  if (input.endedOn !== null) {
    const endedOn = input.endedOn;
    const late = monthCharges.filter((charge) => charge.occurredOn > endedOn).at(-1);
    if (!late) return null;

    return {
      status: 'charged',
      lastChargeCents: late.cents,
      alert: {
        kind: 'charged_after_end',
        amountCents: late.cents,
        occurredOn: late.occurredOn,
        transactionId: late.transactionId,
      },
    };
  }

  const charged = monthCharges.length > 0 || input.occurrenceStatus === 'confirmed';
  const missed =
    input.occurrenceStatus === 'late' ||
    (input.occurrenceStatus === null && input.month < input.currentMonth);
  const status: Subscription.Status = charged ? 'charged' : missed ? 'missed' : 'upcoming';
  const lastChargeCents = lastCharge?.cents ?? null;

  let alert: Subscription.Alert | null = null;
  if (status === 'missed') {
    alert = { kind: 'missed' };
  } else if (
    lastChargeCents !== null &&
    Math.abs(lastChargeCents - input.expectedCents) > SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS
  ) {
    alert = { kind: 'price_changed', fromCents: input.expectedCents, toCents: lastChargeCents };
  }

  return { status, lastChargeCents, alert };
}

export type SubscriptionEvaluation = {
  status: Subscription.Status;
  lastChargeCents: number | null;
  alert: Subscription.Alert | null;
};
