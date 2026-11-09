import { describe, expect, it } from 'vitest';

import {
  createRecurrenceRequestSchema,
  dateRuleSchema,
  updateRecurrenceRequestSchema,
} from '#/recurrences/recurrence/recurrence.schema.ts';

describe('dateRuleSchema', () => {
  it('fixed_day takes the weekend and holiday shift, and only fixed_day', () => {
    for (const shift of ['none', 'before', 'after'] as const) {
      expect(
        dateRuleSchema.parse({ type: 'fixed_day', day: 10, nonBusinessDayShift: shift })
          .nonBusinessDayShift,
      ).toBe(shift);
    }
    expect(
      dateRuleSchema.safeParse({ type: 'fixed_day', day: 10, nonBusinessDayShift: 'later' })
        .success,
    ).toBe(false);
    expect(
      dateRuleSchema.safeParse({
        type: 'business_day',
        businessDayNumber: 5,
        nonBusinessDayShift: 'after',
      }).success,
    ).toBe(false);
    expect(
      dateRuleSchema.safeParse({
        type: 'around_day',
        day: 25,
        toleranceDays: 2,
        nonBusinessDayShift: 'none',
      }).success,
    ).toBe(false);
    expect(
      dateRuleSchema.safeParse({ type: 'any_day', day: 5, nonBusinessDayShift: 'before' }).success,
    ).toBe(false);
  });

  it('fills the unused fields with null', () => {
    expect(dateRuleSchema.parse({ type: 'fixed_day', day: 15 })).toEqual({
      type: 'fixed_day',
      day: 15,
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: null,
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

  it('takes maxPayments null as "as many as come", and keeps it optional', () => {
    expect(createRecurrenceRequestSchema.safeParse({ ...valid, maxPayments: null }).success).toBe(
      true,
    );
    expect(
      createRecurrenceRequestSchema.safeParse({ ...valid, maxPayments: undefined }).success,
    ).toBe(true);
    expect(createRecurrenceRequestSchema.safeParse({ ...valid, maxPayments: 0 }).success).toBe(
      false,
    );
    expect(createRecurrenceRequestSchema.safeParse({ ...valid, maxPayments: 6 }).success).toBe(
      false,
    );
  });

  it('takes the employment regime of an income as CLT, PJ or other', () => {
    for (const employmentRegime of ['clt', 'pj', 'other']) {
      expect(createRecurrenceRequestSchema.safeParse({ ...valid, employmentRegime }).success).toBe(
        true,
      );
    }
    expect(
      createRecurrenceRequestSchema.safeParse({ ...valid, employmentRegime: 'mei' }).success,
    ).toBe(false);
  });

  it('refuses an incomplete date rule', () => {
    expect(
      createRecurrenceRequestSchema.safeParse({ ...valid, dateRule: { type: 'around_day' } })
        .success,
    ).toBe(false);
  });
});

describe('createRecurrenceRequestSchema, subscription (BR-REC-017)', () => {
  const expense = {
    kind: 'expense',
    name: 'Seguro do carro',
    expectedAmountCents: 15000,
    dateRule: { type: 'fixed_day', day: 10 },
  };

  it('is not a subscription unless it says so', () => {
    const parsed = createRecurrenceRequestSchema.parse(expense);
    expect(parsed.isSubscription).toBe(false);
    expect(parsed.serviceSlug).toBeUndefined();
  });

  it('takes a subscription with a service, or with none (Outro), on any method', () => {
    expect(
      createRecurrenceRequestSchema.safeParse({
        ...expense,
        method: 'pix',
        isSubscription: true,
        serviceSlug: 'netflix',
      }).success,
    ).toBe(true);
    expect(
      createRecurrenceRequestSchema.safeParse({
        ...expense,
        isSubscription: true,
        serviceSlug: null,
      }).success,
    ).toBe(true);
  });

  it('refuses a subscription that is an income', () => {
    const result = createRecurrenceRequestSchema.safeParse({
      ...expense,
      kind: 'income',
      isSubscription: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['isSubscription']);
  });

  it('refuses a service without the flag, and an unknown service', () => {
    const result = createRecurrenceRequestSchema.safeParse({ ...expense, serviceSlug: 'netflix' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['serviceSlug']);
    expect(
      createRecurrenceRequestSchema.safeParse({
        ...expense,
        isSubscription: true,
        serviceSlug: 'nope',
      }).success,
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

  it('turns the subscription on or off, with the service apart', () => {
    expect(updateRecurrenceRequestSchema.safeParse({ isSubscription: true }).success).toBe(true);
    expect(updateRecurrenceRequestSchema.safeParse({ serviceSlug: 'spotify' }).success).toBe(true);
    expect(updateRecurrenceRequestSchema.safeParse({ serviceSlug: null }).success).toBe(true);
    expect(
      updateRecurrenceRequestSchema.safeParse({ isSubscription: false, serviceSlug: null }).success,
    ).toBe(true);
  });

  it('refuses a service together with the flag turned off', () => {
    const result = updateRecurrenceRequestSchema.safeParse({
      isSubscription: false,
      serviceSlug: 'spotify',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['serviceSlug']);
  });

  it('takes maxPayments from 1 to 5 or null, and counts null as a field to change', () => {
    expect(updateRecurrenceRequestSchema.safeParse({ maxPayments: null }).success).toBe(true);
    expect(updateRecurrenceRequestSchema.safeParse({ maxPayments: 5 }).success).toBe(true);
    expect(updateRecurrenceRequestSchema.safeParse({ maxPayments: 0 }).success).toBe(false);
    expect(updateRecurrenceRequestSchema.safeParse({ maxPayments: 6 }).success).toBe(false);
  });

  it('clears the employment regime with null', () => {
    expect(updateRecurrenceRequestSchema.safeParse({ employmentRegime: null }).success).toBe(true);
  });
});
