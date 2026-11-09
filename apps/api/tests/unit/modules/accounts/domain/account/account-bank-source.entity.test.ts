import { describe, expect, it } from 'vitest';

import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';

const NOW = '2026-11-09T15:00:00.000Z';
const LATER = '2026-11-09T16:00:00.000Z';

const checking = (overrides: Partial<Account.BankInput> = {}): Account.BankInput => ({
  type: 'checking',
  name: 'Conta Corrente',
  institutionCode: 'nubank',
  institutionName: null,
  balance: Money.fromCents(100000),
  card: null,
  ...overrides,
});

describe('Account.createFromBank', () => {
  it('is a bank account with the balance of the bank as a fact, dated now', () => {
    const account = Account.createFromBank(checking(), NOW);

    expect(account).toMatchObject({
      type: 'checking',
      source: 'pluggy',
      name: 'Conta Corrente',
      institutionCode: 'nubank',
      institutionName: null,
      bankBalanceAt: NOW,
      archivedAt: null,
      creditCard: null,
    });
    expect(account.bankBalance?.cents).toBe(100000);
  });

  it('with no balance from the bank, it has none yet', () => {
    const account = Account.createFromBank(checking({ balance: null }), NOW);

    expect(account.bankBalance).toBeNull();
    expect(account.bankBalanceAt).toBeNull();
  });

  it('cuts a name longer than the contract allows, and never leaves it empty', () => {
    expect(Account.createFromBank(checking({ name: 'x'.repeat(80) }), NOW).name).toHaveLength(60);
    expect(Account.createFromBank(checking({ name: '   ' }), NOW).name).toBe('Conta');
  });

  it('the name of the bank only stays for the institution `other`', () => {
    expect(
      Account.createFromBank(
        checking({ institutionCode: 'other', institutionName: 'Sicredi' }),
        NOW,
      ).institutionName,
    ).toBe('Sicredi');
    expect(
      Account.createFromBank(
        checking({ institutionCode: 'nubank', institutionName: 'Nubank' }),
        NOW,
      ).institutionName,
    ).toBeNull();
  });

  it('a card brings the data the bank gave', () => {
    const account = Account.createFromBank(
      checking({
        type: 'credit_card',
        balance: Money.fromCents(25000),
        card: {
          brand: 'visa',
          last4: '1234',
          closingDay: 5,
          dueDay: 12,
          limit: Money.fromCents(500000),
        },
      }),
      NOW,
    );

    expect(account.creditCard).toMatchObject({
      brand: 'visa',
      last4: '1234',
      closingDay: 5,
      dueDay: 12,
    });
    expect(account.creditCard?.limit?.cents).toBe(500000);
  });

  it('card data goes with a card, and only with it', () => {
    expect(() =>
      Account.createFromBank(checking({ type: 'credit_card', card: null }), NOW),
    ).toThrow(RangeError);
    expect(() =>
      Account.createFromBank(
        checking({
          card: { brand: 'visa', last4: null, closingDay: 5, dueDay: 12, limit: null },
        }),
        NOW,
      ),
    ).toThrow(RangeError);
  });
});

describe('Account.recordBankBalance', () => {
  it('records the balance and the instant', () => {
    const account = Account.createFromBank(checking(), NOW);

    account.recordBankBalance(Money.fromCents(90000), LATER);

    expect(account.bankBalance?.cents).toBe(90000);
    expect(account.bankBalanceAt).toBe(LATER);
  });

  it('with no balance, the last one stays', () => {
    const account = Account.createFromBank(checking(), NOW);

    account.recordBankBalance(null, LATER);

    expect(account.bankBalance?.cents).toBe(100000);
    expect(account.bankBalanceAt).toBe(NOW);
  });

  it('a manual account has no bank balance', () => {
    expect(() => buildTestAccount().recordBankBalance(Money.fromCents(1), NOW)).toThrow(RangeError);
  });
});

describe('Account.switchToManual and switchToBank', () => {
  it('a bank account that is disconnected becomes manual and the bank balance leaves with it', () => {
    const account = Account.createFromBank(checking(), NOW);

    account.switchToManual(LATER);

    expect(account).toMatchObject({ source: 'manual', bankBalance: null, bankBalanceAt: null });
    expect(account.updatedAt).toBe(LATER);
  });

  it('a manual account stays as it is', () => {
    const account = buildTestAccount();

    account.switchToManual(LATER);

    expect(account.updatedAt).not.toBe(LATER);
  });

  it('goes back to the bank when reconnected', () => {
    const account = buildTestAccount();

    account.switchToBank(LATER);

    expect(account.source).toBe('pluggy');
    expect(account.isPluggy()).toBe(true);
  });

  it('a wallet is always manual', () => {
    expect(() => buildTestAccount({ type: 'wallet' }).switchToBank(LATER)).toThrow(RangeError);
  });
});

describe('Account.fillCardFromBank', () => {
  const card = () =>
    Account.createFromBank(
      checking({
        type: 'credit_card',
        card: { brand: 'visa', last4: null, closingDay: 5, dueDay: 12, limit: null },
      }),
      NOW,
    );

  it('fills the last 4 digits and the limit when the card has none', () => {
    const account = card();

    account.fillCardFromBank({ last4: '9876', limit: Money.fromCents(300000) }, LATER);

    expect(account.creditCard?.last4).toBe('9876');
    expect(account.creditCard?.limit?.cents).toBe(300000);
    expect(account.updatedAt).toBe(LATER);
  });

  it('never overwrites what the card already has (the correction of Lucas stays)', () => {
    const account = card();
    account.fillCardFromBank({ last4: '9876', limit: Money.fromCents(300000) }, NOW);

    account.fillCardFromBank({ last4: '1111', limit: Money.fromCents(999999) }, LATER);

    expect(account.creditCard?.last4).toBe('9876');
    expect(account.creditCard?.limit?.cents).toBe(300000);
    expect(account.updatedAt).toBe(NOW);
  });

  it('never touches the closing and the due day', () => {
    const account = card();

    account.fillCardFromBank({ last4: '9876', limit: null }, LATER);

    expect(account.creditCard).toMatchObject({ closingDay: 5, dueDay: 12 });
  });

  it('is nothing on an account that is not a card', () => {
    const account = Account.createFromBank(checking(), NOW);

    account.fillCardFromBank({ last4: '9876', limit: null }, LATER);

    expect(account.creditCard).toBeNull();
  });
});
