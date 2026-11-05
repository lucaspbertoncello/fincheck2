import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { DateRulePhrasePart } from '#/features/recurrences/recurrence-list/types/date-rule-phrase.type.ts';

const text = (value: string): DateRulePhrasePart => ({ kind: 'text', text: value });

/** What a fixed day adds to its sentence when it moves off weekends and holidays. */
const SHIFT_PHRASES = {
  before: ', ou o dia útil anterior',
  after: ', ou o dia útil seguinte',
} as const;

/**
 * The one way each rule is written: "Todo dia 15", "Todo dia 10, ou o dia útil seguinte", "No 5º
 * dia útil", "Perto do dia 10, até 3 dias antes ou depois", "Em qualquer dia do mês".
 * `toleranceDays` only chooses "dia" or "dias"; `shift` only matters to "Todo dia".
 */
export function buildDateRulePhrase(
  type: Recurrence.DateRuleType,
  toleranceDays: number | null = null,
  shift: Recurrence.NonBusinessDayShift | null = null,
): DateRulePhrasePart[] {
  switch (type) {
    case 'fixed_day':
      return [
        text('Todo dia'),
        { kind: 'field', field: 'day' },
        ...(shift === 'before' || shift === 'after' ? [text(SHIFT_PHRASES[shift])] : []),
      ];
    case 'business_day':
      return [text('No'), { kind: 'field', field: 'businessDayNumber' }, text('º dia útil')];
    case 'around_day':
      return [
        text('Perto do dia'),
        { kind: 'field', field: 'day' },
        text(', até'),
        { kind: 'field', field: 'toleranceDays' },
        text(toleranceDays === 1 ? 'dia antes ou depois' : 'dias antes ou depois'),
      ];
    case 'any_day':
      return [text('Em qualquer dia do mês, geralmente no dia'), { kind: 'field', field: 'day' }];
  }
}
