import { describe, expect, it } from 'vitest';

import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-07T09:30:00.000Z';
const CARD = { brand: 'visa', closingDay: 5, dueDay: 12 } as const;

describe('Account.createManual', () => {
  it('creates a manual checking account with the chosen bank', () => {
    const account = Account.createManual(
      { type: 'checking', name: 'Nubank', institutionCode: 'nubank' },
      NOW,
    );

    expect(account).toMatchObject({
      type: 'checking',
      source: 'manual',
      name: 'Nubank',
      institutionCode: 'nubank',
      institutionName: null,
      bankBalance: null,
      creditCard: null,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('forces the wallet institution, whatever came in', () => {
    const account = Account.createManual(
      { type: 'wallet', name: 'Carteira', institutionCode: 'nubank' },
      NOW,
    );

    expect(account.institutionCode).toBe('wallet');
    expect(account.institutionName).toBe(null);
  });

  it('keeps the institution name only for "other"', () => {
    const other = Account.createManual(
      { type: 'savings', name: 'Poupança', institutionCode: 'other', institutionName: 'Sicredi' },
      NOW,
    );

    expect(other.institutionName).toBe('Sicredi');
  });

  it('creates a manual card with its data', () => {
    const account = Account.createManual(
      {
        type: 'credit_card',
        name: 'Roxinho',
        institutionCode: 'nubank',
        creditCard: { ...CARD, last4: '4321', limitCents: 500000, themeId: 'nubank-ultravioleta' },
      },
      NOW,
    );

    expect(account.isCard()).toBe(true);
    expect(account.creditCard).toMatchObject({
      brand: 'visa',
      last4: '4321',
      closingDay: 5,
      dueDay: 12,
      themeId: 'nubank-ultravioleta',
    });
    expect(account.creditCard?.limit?.cents).toBe(500000);
  });

  it('refuses a card without card data and card data on another type', () => {
    expect(() =>
      Account.createManual({ type: 'credit_card', name: 'x', institutionCode: 'nubank' }, NOW),
    ).toThrow(RangeError);
    expect(() =>
      Account.createManual(
        { type: 'checking', name: 'x', institutionCode: 'nubank', creditCard: CARD },
        NOW,
      ),
    ).toThrow(RangeError);
  });
});

describe('Account.edit', () => {
  it('renames and stamps the update', () => {
    const account = buildTestAccount();

    account.edit({ name: 'Outra' }, LATER);

    expect(account.name).toBe('Outra');
    expect(account.updatedAt).toBe(LATER);
  });

  it('renames a Pluggy account but locks its bank', () => {
    const account = buildTestAccount({ source: 'pluggy', bankBalanceCents: 1000 });

    account.edit({ name: 'Apelido' }, LATER);
    expect(account.name).toBe('Apelido');

    expect(() => account.edit({ institutionCode: 'inter' }, LATER)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_SOURCE_LOCKED' }),
    );
    expect(() => account.edit({ institutionName: null }, LATER)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_SOURCE_LOCKED' }),
    );
  });

  it('changes the bank of a manual account', () => {
    const account = buildTestAccount();

    account.edit({ institutionCode: 'inter' }, LATER);

    expect(account.institutionCode).toBe('inter');
  });

  it('asks for the name when the bank becomes "other" and drops it when it stops being', () => {
    const account = buildTestAccount();

    expect(() => account.edit({ institutionCode: 'other' }, LATER)).toThrow(RequestValidationError);
    expect(account.institutionCode).toBe('nubank');

    account.edit({ institutionCode: 'other', institutionName: 'Sicredi' }, LATER);
    expect(account.institutionName).toBe('Sicredi');

    account.edit({ institutionName: 'Banrisul' }, LATER);
    expect(account.institutionName).toBe('Banrisul');
    expect(() => account.edit({ institutionName: null }, LATER)).toThrow(RequestValidationError);

    account.edit({ institutionCode: 'itau' }, LATER);
    expect(account.institutionName).toBe(null);
  });

  it('refuses a bank name on a bank that is not "other"', () => {
    const account = buildTestAccount();

    expect(() => account.edit({ institutionName: 'Sicredi' }, LATER)).toThrow(
      RequestValidationError,
    );
  });

  it('does not let the wallet change bank nor a bank account become a wallet', () => {
    const wallet = buildTestAccount({ type: 'wallet' });
    const checking = buildTestAccount();

    expect(() => wallet.edit({ institutionCode: 'nubank' }, LATER)).toThrow(RequestValidationError);
    expect(() => checking.edit({ institutionCode: 'wallet' }, LATER)).toThrow(
      RequestValidationError,
    );
  });

  it('changes the card data in part, also on a Pluggy card', () => {
    const account = buildTestAccount({ card: true, source: 'pluggy', bankBalanceCents: 100 });

    account.edit({ creditCard: { closingDay: 20, last4: null, limitCents: 900000 } }, LATER);

    expect(account.creditCard).toMatchObject({ closingDay: 20, dueDay: 12, last4: null });
    expect(account.creditCard?.limit?.cents).toBe(900000);
  });

  it('refuses card data on an account that is not a card', () => {
    const account = buildTestAccount();

    expect(() => account.edit({ creditCard: { closingDay: 3 } }, LATER)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_NOT_A_CARD' }),
    );
  });

  it('edits an archived account', () => {
    const account = buildTestAccount({ archivedAt: NOW });

    account.edit({ name: 'Ainda dá' }, LATER);

    expect(account.name).toBe('Ainda dá');
  });

  it('changes nothing when a rule is broken halfway', () => {
    const account = buildTestAccount();

    expect(() => account.edit({ name: 'Novo', institutionCode: 'other' }, LATER)).toThrow();

    expect(account.name).toBe('Conta de teste');
    expect(account.updatedAt).toBe(NOW);
  });
});

describe('Account.archive and unarchive', () => {
  it('archives once and unarchives once', () => {
    const account = buildTestAccount();

    account.archive(LATER);
    expect(account.archivedAt).toBe(LATER);
    expect(() => account.archive(LATER)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_ALREADY_ARCHIVED' }),
    );

    account.unarchive(LATER);
    expect(account.archivedAt).toBe(null);
    expect(() => account.unarchive(LATER)).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_NOT_ARCHIVED' }),
    );
  });
});

describe('Account balance rules', () => {
  it('adjusts the balance of a manual account and a wallet only', () => {
    expect(() => buildTestAccount().assertBalanceAdjustable()).not.toThrow();
    expect(() => buildTestAccount({ type: 'wallet' }).assertBalanceAdjustable()).not.toThrow();
    for (const account of [
      buildTestAccount({ source: 'pluggy', bankBalanceCents: 10 }),
      buildTestAccount({ card: true }),
    ]) {
      expect(() => account.assertBalanceAdjustable()).toThrow(
        expect.objectContaining({ code: 'ACCOUNT_BALANCE_NOT_ADJUSTABLE' }),
      );
    }
  });

  it('refuses to adjust an archived account', () => {
    expect(() => buildTestAccount({ archivedAt: NOW }).assertBalanceAdjustable()).toThrow(
      expect.objectContaining({ code: 'ACCOUNT_ARCHIVED' }),
    );
  });

  it('has a balance curve for accounts with a balance, not for cards nor Pluggy without one', () => {
    expect(() => buildTestAccount().assertHasBalanceHistory()).not.toThrow();
    expect(() =>
      buildTestAccount({ source: 'pluggy', bankBalanceCents: 10 }).assertHasBalanceHistory(),
    ).not.toThrow();
    for (const account of [
      buildTestAccount({ card: true }),
      buildTestAccount({ source: 'pluggy' }),
    ]) {
      expect(() => account.assertHasBalanceHistory()).toThrow(
        expect.objectContaining({ code: 'ACCOUNT_HISTORY_NOT_AVAILABLE' }),
      );
    }
  });

  it('calculates the balance of manual accounts and wallets, not of cards nor Pluggy', () => {
    expect(buildTestAccount().hasCalculatedBalance()).toBe(true);
    expect(buildTestAccount({ type: 'wallet' }).hasCalculatedBalance()).toBe(true);
    expect(buildTestAccount({ card: true }).hasCalculatedBalance()).toBe(false);
    expect(buildTestAccount({ source: 'pluggy' }).hasCalculatedBalance()).toBe(false);
  });
});
