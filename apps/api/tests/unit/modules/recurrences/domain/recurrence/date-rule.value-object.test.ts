import { describe, expect, it } from 'vitest';

import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { RecurrenceDateRuleInvalidError } from '#/modules/recurrences/domain/recurrence/recurrence-date-rule-invalid.error.ts';

describe('DateRule', () => {
  it('builds a fixed day and reads a missing shift as none', () => {
    expect(DateRule.create({ type: 'fixed_day', day: 15 }).toDto()).toEqual({
      type: 'fixed_day',
      day: 15,
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: 'none',
    });
  });

  it('keeps the shift of a fixed day', () => {
    expect(
      DateRule.create({ type: 'fixed_day', day: 10, nonBusinessDayShift: 'after' }).toDto(),
    ).toMatchObject({ nonBusinessDayShift: 'after' });
  });

  it('builds the nth business day, around a day, and any day with or without a likely day', () => {
    expect(DateRule.create({ type: 'business_day', businessDayNumber: 5 }).toDto()).toEqual({
      type: 'business_day',
      day: null,
      businessDayNumber: 5,
      toleranceDays: null,
      nonBusinessDayShift: null,
    });
    expect(
      DateRule.create({ type: 'around_day', day: 25, toleranceDays: 2 }).toDto(),
    ).toMatchObject({ day: 25, toleranceDays: 2, nonBusinessDayShift: null });
    expect(DateRule.create({ type: 'any_day' }).toDto()).toMatchObject({ day: null });
    expect(DateRule.create({ type: 'any_day', day: 5 }).toDto()).toMatchObject({ day: 5 });
  });

  it.each([
    ['a fixed day without a day', { type: 'fixed_day' }],
    ['a fixed day with a business day number', { type: 'fixed_day', day: 5, businessDayNumber: 3 }],
    ['a fixed day with a tolerance', { type: 'fixed_day', day: 5, toleranceDays: 1 }],
    ['a business day without a number', { type: 'business_day' }],
    ['a business day with a day', { type: 'business_day', businessDayNumber: 5, day: 3 }],
    [
      'a business day with a shift',
      { type: 'business_day', businessDayNumber: 5, nonBusinessDayShift: 'before' },
    ],
    ['around a day without a tolerance', { type: 'around_day', day: 25 }],
    ['around a day without a day', { type: 'around_day', toleranceDays: 2 }],
    [
      'around a day with a shift',
      { type: 'around_day', day: 25, toleranceDays: 2, nonBusinessDayShift: 'after' },
    ],
    ['any day with a tolerance', { type: 'any_day', toleranceDays: 2 }],
    ['any day with a business day number', { type: 'any_day', businessDayNumber: 2 }],
    ['any day with a shift', { type: 'any_day', nonBusinessDayShift: 'none' }],
  ] as const)('refuses %s with RECURRENCE_DATE_RULE_INVALID', (_name, input) => {
    expect(() => DateRule.create(input)).toThrow(RecurrenceDateRuleInvalidError);
  });

  it('compares by value', () => {
    const rule = DateRule.create({ type: 'fixed_day', day: 15 });

    expect(
      rule.equals(DateRule.create({ type: 'fixed_day', day: 15, nonBusinessDayShift: 'none' })),
    ).toBe(true);
    expect(rule.equals(DateRule.create({ type: 'fixed_day', day: 16 }))).toBe(false);
    expect(
      rule.equals(DateRule.create({ type: 'fixed_day', day: 15, nonBusinessDayShift: 'before' })),
    ).toBe(false);
    expect(rule.equals(DateRule.create({ type: 'any_day', day: 15 }))).toBe(false);
  });
});
