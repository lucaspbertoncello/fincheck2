import type { RecurrenceFormField } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

/** The message under each field when the schema rejects it. */
export const FORM_ERROR_MESSAGES: Record<RecurrenceFormField, string> = {
  name: 'Dê um nome à recorrência, com até 80 letras.',
  amountCents: 'Informe um valor maior que zero.',
  counterparty: 'Use até 120 letras.',
  matchText: 'Use até 80 letras.',
  day: 'Informe um dia de 1 a 31.',
  businessDayNumber: 'Informe um dia útil de 1 a 23.',
  toleranceDays: 'Informe de 0 a 15 dias.',
  maxPayments: 'Informe de 1 a 5 pagamentos.',
};

/** Which form field a schema issue path belongs to. */
export const ISSUE_PATH_TO_FIELD: Record<string, RecurrenceFormField> = {
  name: 'name',
  expectedAmountCents: 'amountCents',
  counterparty: 'counterparty',
  matchText: 'matchText',
  'dateRule.day': 'day',
  'dateRule.businessDayNumber': 'businessDayNumber',
  'dateRule.toleranceDays': 'toleranceDays',
  maxPayments: 'maxPayments',
};
