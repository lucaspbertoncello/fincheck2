import { describe, expect, it } from 'vitest';

import {
  createAccountRequestSchema,
  listAccountsQuerySchema,
  updateAccountRequestSchema,
} from '#/accounts/account/account.schema.ts';

const card = { brand: 'visa', closingDay: 28, dueDay: 5 } as const;

describe('createAccountRequestSchema', () => {
  it('accepts a checking account with a negative initial balance', () => {
    const result = createAccountRequestSchema.safeParse({
      type: 'checking',
      name: 'Conta',
      institutionCode: 'bradesco',
      initialBalanceCents: -1500,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a wallet without an institution', () => {
    expect(createAccountRequestSchema.safeParse({ type: 'wallet', name: 'Carteira' }).success).toBe(
      true,
    );
  });

  it('needs card data on a credit card and refuses an initial balance there', () => {
    const base = { type: 'credit_card', name: 'Roxinho', institutionCode: 'nubank' };
    expect(createAccountRequestSchema.safeParse(base).success).toBe(false);
    expect(createAccountRequestSchema.safeParse({ ...base, creditCard: card }).success).toBe(true);
    expect(
      createAccountRequestSchema.safeParse({ ...base, creditCard: card, initialBalanceCents: 1 })
        .success,
    ).toBe(false);
  });

  it('refuses card data on a checking account', () => {
    const result = createAccountRequestSchema.safeParse({
      type: 'checking',
      name: 'Conta',
      institutionCode: 'nubank',
      creditCard: card,
    });
    expect(result.success).toBe(false);
  });

  it('refuses the wallet institution on a bank account', () => {
    const result = createAccountRequestSchema.safeParse({
      type: 'savings',
      name: 'Reserva',
      institutionCode: 'wallet',
    });
    expect(result.success).toBe(false);
  });

  it('asks for the institution name only when the institution is other', () => {
    const base = { type: 'checking', name: 'Conta' };
    expect(
      createAccountRequestSchema.safeParse({ ...base, institutionCode: 'other' }).success,
    ).toBe(false);
    expect(
      createAccountRequestSchema.safeParse({
        ...base,
        institutionCode: 'other',
        institutionName: 'Sicredi',
      }).success,
    ).toBe(true);
    expect(
      createAccountRequestSchema.safeParse({
        ...base,
        institutionCode: 'nubank',
        institutionName: 'Sicredi',
      }).success,
    ).toBe(false);
  });

  it('keeps the name between 1 and 60 characters, trimmed', () => {
    const base = { type: 'wallet' };
    expect(createAccountRequestSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(createAccountRequestSchema.safeParse({ ...base, name: 'a'.repeat(61) }).success).toBe(
      false,
    );
  });

  it('refuses a fractional initial balance', () => {
    const result = createAccountRequestSchema.safeParse({
      type: 'checking',
      name: 'Conta',
      institutionCode: 'nubank',
      initialBalanceCents: 10.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAccountRequestSchema', () => {
  it('needs at least one field and refuses unknown keys', () => {
    expect(updateAccountRequestSchema.safeParse({}).success).toBe(false);
    expect(updateAccountRequestSchema.safeParse({ type: 'wallet' }).success).toBe(false);
    expect(updateAccountRequestSchema.safeParse({ name: 'Novo nome' }).success).toBe(true);
  });
});

describe('listAccountsQuerySchema', () => {
  it('defaults includeArchived to false and reads the text', () => {
    expect(listAccountsQuerySchema.parse({})).toEqual({ includeArchived: false });
    expect(listAccountsQuerySchema.parse({ includeArchived: 'true' })).toEqual({
      includeArchived: true,
    });
  });
});
