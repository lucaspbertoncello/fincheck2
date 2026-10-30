import { describe, expect, it } from 'vitest';

import {
  createRecurrenceRequestSchema,
  dateRuleSchema,
  updateRecurrenceRequestSchema,
} from '#/recurrences/recurrence/recurrence.schema.ts';

describe('dateRuleSchema', () => {
  it('fills the unused fields with null', () => {
    expect(dateRuleSchema.parse({ type: 'fixed_day', day: 15 })).toEqual({
      type: 'fixed_day',
      day: 15,
      businessDayNumber: null,
      toleranceDays: null,
    });
  });

  it('fixed_day needs the day and nothing else', () => {
    expect(dateRuleSchema.safeParse({ type: 'fixed_day' }).success).toBe(false);
    expect(dateRuleSchema.safeParse({ type: 'fixed_day', day: 15, toleranceDays: 2 }).success).toBe(
      false,
    );
  });

  it('business_day needs the number, from 1 to 23', () => {
    expect(dateRuleSchema.safeParse({ type: 'business_day', businessDayNumber: 5 }).success).toBe(
      true,
    );
    expect(dateRuleSchema.safeParse({ type: 'business_day', businessDayNumber: 24 }).success).toBe(
      false,
    );
    expect(dateRuleSchema.safeParse({ type: 'business_day', day: 5 }).success).toBe(false);
  });

  it('around_day needs the day and the tolerance, up to 15', () => {
    expect(
      dateRuleSchema.safeParse({ type: 'around_day', day: 25, toleranceDays: 2 }).success,
    ).toBe(true);
    expect(dateRuleSchema.safeParse({ type: 'around_day', day: 25 }).success).toBe(false);
    expect(
      dateRuleSchema.safeParse({ type: 'around_day', day: 25, toleranceDays: 16 }).success,
    ).toBe(false);
  });

  it('any_day takes an optional probable day and nothing else', () => {
    expect(dateRuleSchema.safeParse({ type: 'any_day' }).success).toBe(true);
    expect(dateRuleSchema.safeParse({ type: 'any_day', day: 5 }).success).toBe(true);
    expect(dateRuleSchema.safeParse({ type: 'any_day', toleranceDays: 1 }).success).toBe(false);
  });

  it('keeps the day between 1 and 31', () => {
    expect(dateRuleSchema.safeParse({ type: 'fixed_day', day: 32 }).success).toBe(false);
  });
});

describe('createRecurrenceRequestSchema', () => {
  const valid = {
    kind: 'income',
    name: 'Mesada',
    expectedAmountCents: 80000,
    dateRule: { type: 'any_day' },
    maxPayments: 2,
  };

  it('accepts the mesada case: any day, up to two Pix', () => {
    expect(createRecurrenceRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('keeps maxPayments between 1 and 5 and the amount positive', () => {
    expect(createRecurrenceRequestSchema.safeParse({ ...valid, maxPayments: 6 }).success).toBe(
      false,
    );
    expect(
      createRecurrenceRequestSchema.safeParse({ ...valid, expectedAmountCents: 0 }).success,
    ).toBe(false);
  });

  it('refuses an incomplete date rule', () => {
    expect(
      createRecurrenceRequestSchema.safeParse({ ...valid, dateRule: { type: 'around_day' } })
        .success,
    ).toBe(false);
  });
});

describe('updateRecurrenceRequestSchema', () => {
  it('needs a field besides applyFrom, and never changes the kind', () => {
    expect(updateRecurrenceRequestSchema.safeParse({ applyFrom: 'current_month' }).success).toBe(
      false,
    );
    expect(
      updateRecurrenceRequestSchema.safeParse({ name: 'Novo', applyFrom: 'current_month' }).success,
    ).toBe(true);
    expect(updateRecurrenceRequestSchema.safeParse({ kind: 'expense' }).success).toBe(false);
  });
});
