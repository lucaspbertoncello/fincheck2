import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';

type DateRuleTypeOption = {
  key: RecurrenceFormValues['ruleType'];
  /** The first words of the sentence of that rule, so the choice and the sentence read as one. */
  label: string;
};

/** The 4 ways a recurrence falls in the month, in the order they are offered. */
export const DATE_RULE_TYPE_OPTIONS: readonly DateRuleTypeOption[] = [
  { key: 'fixed_day', label: 'Dia fixo' },
  { key: 'business_day', label: 'Dia útil' },
  { key: 'around_day', label: 'Perto do dia' },
  { key: 'any_day', label: 'Qualquer dia' },
];
