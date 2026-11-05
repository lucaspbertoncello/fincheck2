import { SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS } from '@fincheck/shared/recurrences/subscription/subscription.constant.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { findMonthOccurrence } from '#mocks/recurrences/subscription/find-month-occurrence.util.ts';
import { findRecurrenceCharges } from '#mocks/recurrences/subscription/find-recurrence-charges.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';

// The business date a recurrence ended on (paused or deleted), when it did.
function endedOn(recurrence: MockState.RecurrenceRecord): string | null {
  const instant = recurrence.pausedAt ?? recurrence.archivedAt;

  return instant ? instant.slice(0, 10) : null;
}

// One row of the tab: the recurrence, the state of the month and the warning that fits it. Returns
// null for an ended recurrence that did not charge after it ended (it has no place in the tab).
export function buildSubscriptionItem(
  database: MockState.Database,
  recurrence: MockState.RecurrenceRecord,
  month: string,
): Subscription.Item | null {
  const endDate = endedOn(recurrence);
  const occurrence = findMonthOccurrence(database, recurrence.id, month);
  const monthEnd = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const charges = findRecurrenceCharges(database, recurrence).filter(
    (tx) => tx.occurredOn <= monthEnd,
  );
  const monthCharges = charges.filter((tx) => tx.occurredOn.startsWith(month));
  const lastCharge = charges.at(-1) ?? null;
  const lastChargeCents = lastCharge ? Math.abs(lastCharge.amountCents) : null;
  const expectedDay = occurrence?.expectedOn ? dayOf(occurrence.expectedOn) : null;
  const chargeDay =
    recurrence.dateRule.day ?? expectedDay ?? (lastCharge ? dayOf(lastCharge.occurredOn) : 1);
  const listItem = { ...recurrence, occurrence };

  if (endDate) {
    const late = monthCharges.filter((tx) => tx.occurredOn > endDate).at(-1);
    if (!late) return null;

    return {
      recurrence: listItem,
      chargeDay,
      status: 'charged',
      lastChargeCents: Math.abs(late.amountCents),
      alert: {
        kind: 'charged_after_end',
        amountCents: Math.abs(late.amountCents),
        occurredOn: late.occurredOn,
        transactionId: late.id,
      },
    };
  }

  const charged = monthCharges.length > 0 || occurrence?.status === 'confirmed';
  const missed = occurrence?.status === 'late' || (!occurrence && month < CURRENT_MONTH);
  const status: Subscription.Status = charged ? 'charged' : missed ? 'missed' : 'upcoming';

  let alert: Subscription.Alert | null = null;
  if (status === 'missed') {
    alert = { kind: 'missed' };
  } else if (
    lastChargeCents !== null &&
    Math.abs(lastChargeCents - recurrence.expectedAmountCents) >
      SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS
  ) {
    alert = {
      kind: 'price_changed',
      fromCents: recurrence.expectedAmountCents,
      toCents: lastChargeCents,
    };
  }

  return { recurrence: listItem, chargeDay, status, lastChargeCents, alert };
}
