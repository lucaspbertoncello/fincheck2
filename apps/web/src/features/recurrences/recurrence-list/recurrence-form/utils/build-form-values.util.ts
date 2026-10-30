import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

/** The form of "Editar recorrência", filled with the saved recurrence. */
export function buildFormValues(recurrence: Recurrence.Dto): RecurrenceFormValues {
  const { dateRule } = recurrence;

  return {
    kind: recurrence.kind,
    name: recurrence.name,
    amountCents: recurrence.expectedAmountCents,
    counterparty: recurrence.counterparty ?? '',
    matchText: recurrence.matchText ?? '',
    ruleType: dateRule.type,
    day: dateRule.day === null ? '' : String(dateRule.day),
    businessDayNumber:
      dateRule.businessDayNumber === null ? '' : String(dateRule.businessDayNumber),
    toleranceDays: dateRule.toleranceDays === null ? '' : String(dateRule.toleranceDays),
    maxPayments: String(recurrence.maxPayments),
    applyFrom: 'next_month',
  };
}
