import { describe, expect, it } from 'vitest';

import {
  createCreditCardRequestSchema,
  updateCreditCardRequestSchema,
} from '#/accounts/credit-card/credit-card.schema.ts';

describe('createCreditCardRequestSchema', () => {
  const valid = { brand: 'mastercard', closingDay: 20, dueDay: 28 };

  it('accepts the required fields and the optional ones', () => {
    expect(createCreditCardRequestSchema.safeParse(valid).success).toBe(true);
    expect(
      createCreditCardRequestSchema.safeParse({ ...valid, last4: '1234', limitCents: 500000 })
        .success,
    ).toBe(true);
  });

  it('keeps the days between 1 and 31', () => {
    expect(createCreditCardRequestSchema.safeParse({ ...valid, closingDay: 0 }).success).toBe(
      false,
    );
    expect(createCreditCardRequestSchema.safeParse({ ...valid, dueDay: 32 }).success).toBe(false);
  });

  it('keeps only four digits of the number', () => {
    expect(createCreditCardRequestSchema.safeParse({ ...valid, last4: '12345' }).success).toBe(
      false,
    );
    expect(createCreditCardRequestSchema.safeParse({ ...valid, last4: '12a4' }).success).toBe(
      false,
    );
  });

  it('refuses a limit that is not above zero', () => {
    expect(createCreditCardRequestSchema.safeParse({ ...valid, limitCents: 0 }).success).toBe(
      false,
    );
  });
});

describe('updateCreditCardRequestSchema', () => {
  it('lets null clear the optional fields', () => {
    expect(
      updateCreditCardRequestSchema.safeParse({ last4: null, limitCents: null, themeId: null })
        .success,
    ).toBe(true);
  });
});
