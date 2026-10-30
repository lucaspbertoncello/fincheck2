import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

function toNumber(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : Number(trimmed);
}

/** The date rule of the form: only the fields the chosen type uses; the rest are `null`. */
export function buildDateRule(
  values: Pick<RecurrenceFormValues, 'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays'>,
): Recurrence.DateRule {
  const { ruleType } = values;

  return {
    type: ruleType,
    day: ruleType === 'business_day' ? null : toNumber(values.day),
    businessDayNumber: ruleType === 'business_day' ? toNumber(values.businessDayNumber) : null,
    toleranceDays: ruleType === 'around_day' ? toNumber(values.toleranceDays) : null,
  };
}
