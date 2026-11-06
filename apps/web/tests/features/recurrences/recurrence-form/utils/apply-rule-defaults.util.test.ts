import { describe, expect, it } from 'vitest';

import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-form/constants/empty-form-values.constant.ts';
import { applyRuleDefaults } from '#/features/recurrences/recurrence-form/utils/apply-rule-defaults.util.ts';

describe('applyRuleDefaults', () => {
  it('opens the form on "Dia fixo" with the day of its card, so the rule is already complete', () => {
    expect(EMPTY_FORM_VALUES.ruleType).toBe('fixed_day');
    expect(EMPTY_FORM_VALUES.day).toBe('15');
  });

  it('fills the 5th business day when that rule is chosen', () => {
    const rule = {
      ruleType: 'business_day' as const,
      day: '15',
      businessDayNumber: '',
      toleranceDays: '',
    };

    expect(applyRuleDefaults(rule)).toEqual({ businessDayNumber: '5' });
  });

  it('keeps what was typed and completes the rest', () => {
    const rule = {
      ruleType: 'around_day' as const,
      day: '28',
      businessDayNumber: '',
      toleranceDays: '',
    };

    expect(applyRuleDefaults(rule)).toEqual({ day: '28', toleranceDays: '2' });
  });

  it('asks nothing of "Qualquer dia"', () => {
    const rule = {
      ruleType: 'any_day' as const,
      day: '',
      businessDayNumber: '',
      toleranceDays: '',
    };

    expect(applyRuleDefaults(rule)).toEqual({});
  });
});
