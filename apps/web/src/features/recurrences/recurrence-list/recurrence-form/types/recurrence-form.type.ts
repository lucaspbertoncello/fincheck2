import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/** What is typed in the form. Numbers stay as text until the schema reads them. */
export type RecurrenceFormValues = {
  kind: Recurrence.Kind;
  name: string;
  amountCents: number;
  counterparty: string;
  matchText: string;
  ruleType: Recurrence.DateRuleType;
  day: string;
  businessDayNumber: string;
  toleranceDays: string;
  maxPayments: string;
  applyFrom: Recurrence.ApplyFrom;
};

export type RecurrenceFormField =
  | 'name'
  | 'amountCents'
  | 'counterparty'
  | 'matchText'
  | 'day'
  | 'businessDayNumber'
  | 'toleranceDays'
  | 'maxPayments';

export type RecurrenceFormErrors = Partial<Record<RecurrenceFormField, string>>;

export type BuildBodyResult<TBody> =
  | { status: 'ok'; body: TBody }
  | { status: 'invalid'; errors: RecurrenceFormErrors }
  | { status: 'unchanged' };
