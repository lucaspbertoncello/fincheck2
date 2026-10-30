import type { DateRuleOption } from '@fincheck/ui';

import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

type RuleInput = Pick<
  RecurrenceFormValues,
  'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays'
>;

function filled(text: string, fallback: string): string {
  return text.trim() === '' ? fallback : text.trim();
}

/** The 4 cards of "Quando cai"; the chosen one repeats what was typed ("Dia 25, 2 dias..."). */
export function buildDateRuleOptions(values: RuleInput): DateRuleOption[] {
  const chosen = values.ruleType;

  return [
    {
      key: 'fixed_day',
      label: 'Dia fixo',
      icon: 'calendar-mark',
      hint: chosen === 'fixed_day' ? `Todo dia ${filled(values.day, '…')}` : 'Sempre no mesmo dia',
    },
    {
      key: 'business_day',
      label: 'Dia útil',
      icon: 'calendar',
      hint:
        chosen === 'business_day'
          ? `Até o ${filled(values.businessDayNumber, '…')}º dia útil`
          : 'Por exemplo, o 5º dia útil',
    },
    {
      key: 'around_day',
      label: 'Por volta do dia',
      icon: 'clock',
      hint:
        chosen === 'around_day'
          ? `Dia ${filled(values.day, '…')}, ${filled(values.toleranceDays, '…')} dias para mais ou menos`
          : 'Com folga para mais ou menos',
    },
    {
      key: 'any_day',
      label: 'Qualquer dia',
      icon: 'repeat',
      hint: 'Com um dia provável, se quiser',
    },
  ];
}
