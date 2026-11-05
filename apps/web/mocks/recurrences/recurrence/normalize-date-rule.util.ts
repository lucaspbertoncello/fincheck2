import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

// The rule as the API answers it: `none` in a fixed day without shift (a missing one in the body is
// `none`), `null` in every other rule.
export function normalizeDateRule(rule: Recurrence.DateRule): Recurrence.DateRule {
  return {
    ...rule,
    nonBusinessDayShift: rule.type === 'fixed_day' ? (rule.nonBusinessDayShift ?? 'none') : null,
  };
}
