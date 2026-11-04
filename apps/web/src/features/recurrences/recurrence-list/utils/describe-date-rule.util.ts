import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import { buildDateRulePhrase } from '#/features/recurrences/recurrence-list/utils/build-date-rule-phrase.util.ts';

/** Words that stick to the number before them: "5" + "º dia útil", "10" + ", até". */
const GLUED = /^[º,]/;

/**
 * The date rule in Portuguese, written the same way as the sentence of the form: "Todo dia 20",
 * "No 5º dia útil", "Perto do dia 25, até 2 dias antes ou depois", "Em qualquer dia do mês",
 * "Em qualquer dia do mês, geralmente no dia 5". With payments split in Pix: "..., em até 2 Pix".
 */
export function describeDateRule(rule: Recurrence.DateRule, maxPayments = 1): string {
  const numbers = {
    day: rule.day,
    businessDayNumber: rule.businessDayNumber,
    toleranceDays: rule.toleranceDays,
  };
  const base = (() => {
    if (rule.type === 'around_day' && rule.toleranceDays === 0) {
      return `Perto do dia ${rule.day}, sem folga`;
    }
    if (rule.type === 'any_day' && rule.day === null) return 'Em qualquer dia do mês';

    return buildDateRulePhrase(rule.type, rule.toleranceDays).reduce((sentence, part) => {
      const piece = part.kind === 'text' ? part.text : String(numbers[part.field] ?? '');
      if (sentence === '') return piece;
      return GLUED.test(piece) ? `${sentence}${piece}` : `${sentence} ${piece}`;
    }, '');
  })();

  return maxPayments > 1 ? `${base}, em até ${maxPayments} Pix` : base;
}
