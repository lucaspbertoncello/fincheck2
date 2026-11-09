import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { describe, expect, it } from 'vitest';

import { describeDateRule } from '#/shared/utils/recurrences/describe-date-rule.util.ts';

const ANY_DAY: Recurrence.DateRule = {
  type: 'any_day',
  day: null,
  businessDayNumber: null,
  toleranceDays: null,
  nonBusinessDayShift: null,
};

describe('describeDateRule, payments in the month', () => {
  it('says nothing for one payment, which is also the default', () => {
    expect(describeDateRule(ANY_DAY)).toBe('Em qualquer dia do mês');
    expect(describeDateRule(ANY_DAY, 1)).toBe('Em qualquer dia do mês');
  });

  it('says "em até N Pix" for a limit above one', () => {
    expect(describeDateRule(ANY_DAY, 2)).toBe('Em qualquer dia do mês, em até 2 Pix');
  });

  it('says "em quantos Pix vierem" for "Quantas vierem" (null)', () => {
    expect(describeDateRule(ANY_DAY, null)).toBe('Em qualquer dia do mês, em quantos Pix vierem');
    expect(
      describeDateRule(
        {
          type: 'fixed_day',
          day: 5,
          businessDayNumber: null,
          toleranceDays: null,
          nonBusinessDayShift: 'none',
        },
        null,
      ),
    ).toBe('Todo dia 5, em quantos Pix vierem');
  });
});
