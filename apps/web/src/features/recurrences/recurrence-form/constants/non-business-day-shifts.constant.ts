import type { ChoiceOption } from '@fincheck/ui';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/**
 * What "Todo dia N" does when N falls on a weekend or a national holiday, in the order offered
 * (BR-REC-016). The labels are short so the three fit on one line at 375 px and, on the desktop,
 * beside "Todo dia 15" inside the sentence box; the caption "Se cair no fim de semana ou feriado"
 * says what they are for.
 */
export const NON_BUSINESS_DAY_SHIFT_OPTIONS: readonly (ChoiceOption & {
  key: Recurrence.NonBusinessDayShift;
})[] = [
  { key: 'none', label: 'No dia' },
  { key: 'before', label: 'Útil antes' },
  { key: 'after', label: 'Útil depois' },
];

/** What the same space says for the rules that have no shift, so it never stands empty. */
export const NO_SHIFT_HINTS: Record<Exclude<Recurrence.DateRuleType, 'fixed_day'>, string> = {
  business_day: 'Fim de semana e feriado nacional não contam como dia útil.',
  around_day: 'O app procura o pagamento nos dias em volta do dia escolhido.',
  any_day: 'Sem dia certo, o app procura o pagamento no mês inteiro.',
};
