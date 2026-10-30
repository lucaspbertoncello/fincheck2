import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/** The date rule in Portuguese: "Todo dia 20", "Até o 5º dia útil", "Qualquer dia, em até 2 Pix". */
export function describeDateRule(rule: Recurrence.DateRule, maxPayments = 1): string {
  const base = (() => {
    switch (rule.type) {
      case 'fixed_day':
        return `Todo dia ${rule.day}`;
      case 'business_day':
        return `Até o ${rule.businessDayNumber}º dia útil`;
      case 'around_day':
        return `Por volta do dia ${rule.day}`;
      case 'any_day':
        return rule.day ? `Qualquer dia, geralmente no dia ${rule.day}` : 'Qualquer dia';
    }
  })();

  return maxPayments > 1 ? `${base}, em até ${maxPayments} Pix` : base;
}
