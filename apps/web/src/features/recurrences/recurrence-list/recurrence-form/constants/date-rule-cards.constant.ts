import type { IconName } from '@fincheck/ui';

import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

export type DateRuleCard = {
  key: RecurrenceFormValues['ruleType'];
  label: string;
  /** A short example under the name, in the words of the rule. */
  example: string;
  icon: IconName;
};

/** The 4 ways a recurrence falls in the month, as cards. */
export const DATE_RULE_CARDS: readonly DateRuleCard[] = [
  { key: 'fixed_day', label: 'Dia fixo', example: 'Todo dia 15', icon: 'calendar-mark' },
  { key: 'business_day', label: 'Dia útil', example: 'O 5º dia útil', icon: 'calendar' },
  { key: 'around_day', label: 'Por volta de', example: 'Dia 25, com folga', icon: 'clock' },
  { key: 'any_day', label: 'Qualquer dia', example: 'Sem data certa', icon: 'repeat' },
];
