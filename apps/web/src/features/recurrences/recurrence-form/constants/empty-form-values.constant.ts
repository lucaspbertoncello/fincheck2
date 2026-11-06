import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';
import { DEFAULT_RULE_DAY } from '#/features/recurrences/recurrence-form/constants/rule-defaults.constant.ts';

/** The form of "Nova recorrência": an expense on a fixed day. */
export const EMPTY_FORM_VALUES: RecurrenceFormValues = {
  kind: 'expense',
  name: '',
  amountCents: 0,
  counterparty: '',
  matchText: '',
  employmentRegime: '',
  categoryId: null,
  accountId: null,
  ruleType: 'fixed_day',
  day: DEFAULT_RULE_DAY,
  businessDayNumber: '',
  toleranceDays: '',
  nonBusinessDayShift: 'none',
  maxPayments: '1',
  applyFrom: 'next_month',
};
