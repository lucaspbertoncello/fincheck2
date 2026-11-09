import { describe, expect, it } from 'vitest';

import type { PluggyAccount } from '#/modules/sync/infra/pluggy/pluggy-account.type.ts';
import { translatePluggyAccount } from '#/modules/sync/infra/pluggy/translate-pluggy-account.util.ts';

const account = (partial: Partial<PluggyAccount.Response>): PluggyAccount.Response => ({
  id: 'acc-1',
  type: 'BANK',
  subtype: 'CHECKING_ACCOUNT',
  name: 'Conta Corrente',
  balance: 1234.56,
  number: '12345-6',
  currencyCode: 'BRL',
  ...partial,
});

describe('translatePluggyAccount', () => {
  it('translates a checking account', () => {
    expect(translatePluggyAccount(account({}))).toEqual({
      id: 'acc-1',
      name: 'Conta Corrente',
      type: 'checking',
      balanceCents: 123456,
      numberHint: '3456',
      card: null,
    });
  });

  it('translates a savings account', () => {
    expect(translatePluggyAccount(account({ subtype: 'SAVINGS_ACCOUNT' }))?.type).toBe('savings');
  });

  it('keeps the sign of an overdrawn balance', () => {
    expect(translatePluggyAccount(account({ balance: -10.1 }))?.balanceCents).toBe(-1010);
  });

  it.each([
    ['INVESTMENT', 'type'],
    ['LOAN', 'type'],
    ['', 'type'],
  ])('discards the subtype %s', (subtype) => {
    expect(translatePluggyAccount(account({ subtype }))).toBeNull();
  });

  it.each([
    ['12345-6', '3456'],
    ['0001', '0001'],
    ['**** **** **** 4321', '4321'],
    ['123', null],
    ['ab-12', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('number %s gives the hint %s', (number, hint) => {
    expect(translatePluggyAccount(account({ number }))?.numberHint).toBe(hint);
  });

  it('has a null balance when the bank sends none', () => {
    expect(translatePluggyAccount(account({ balance: null }))?.balanceCents).toBeNull();
    expect(translatePluggyAccount(account({ balance: undefined }))?.balanceCents).toBeNull();
  });

  it.each(['USD', 'eur'])(
    'does not keep an account in %s (its balance would be read as reais)',
    (currencyCode) => {
      expect(translatePluggyAccount(account({ currencyCode }))).toBeNull();
    },
  );

  it('keeps an account in BRL or with no currency said', () => {
    expect(translatePluggyAccount(account({ currencyCode: 'brl' }))).not.toBeNull();
    expect(translatePluggyAccount(account({ currencyCode: undefined }))).not.toBeNull();
  });

  it('falls back to the marketing name and then to a default one', () => {
    expect(translatePluggyAccount(account({ name: ' ', marketingName: 'Ouro' }))?.name).toBe(
      'Ouro',
    );
    expect(translatePluggyAccount(account({ name: '' }))?.name).toBe('Sem nome');
  });

  describe('credit card', () => {
    const card = (creditData: PluggyAccount.Response['creditData']): PluggyAccount.Response =>
      account({
        type: 'CREDIT',
        subtype: 'CREDIT_CARD',
        name: 'Cartão Gold',
        balance: 750.1,
        number: '5555 4444 3333 2222',
        creditData,
      });

    it('translates the brand, the days and the limit', () => {
      expect(
        translatePluggyAccount(
          card({
            brand: 'MASTERCARD',
            balanceCloseDate: '2026-10-25T00:00:00.000Z',
            balanceDueDate: '2026-11-05T00:00:00.000Z',
            creditLimit: 5000,
            availableCreditLimit: 4249.9,
          }),
        ),
      ).toEqual({
        id: 'acc-1',
        name: 'Cartão Gold',
        type: 'credit_card',
        // As it came, not flipped: it is the amount used.
        balanceCents: 75010,
        numberHint: '2222',
        card: { brand: 'mastercard', closingDay: null, dueDay: 5, limitCents: 500000 },
      });
    });

    // `balanceCloseDate` is the date the balance was calculated, not the closing day of the card
    // (https://docs.pluggy.ai/en/docs/products/accounts, 09/11/2026), and the Pluggy has no field for
    // it: the closing day is never taken from it, so it stays the default (7 days before the due day).
    it('never reads the closing day from `balanceCloseDate`, whatever day it falls on', () => {
      for (const balanceCloseDate of ['2026-10-25T00:00:00.000Z', '2026-11-09T00:00:00.000Z']) {
        expect(
          translatePluggyAccount(card({ balanceCloseDate, balanceDueDate: '2026-10-01' }))?.card,
        ).toMatchObject({ closingDay: null, dueDay: 1 });
      }
    });

    it('applies the date rule to the due day (an instant is the business day)', () => {
      expect(
        translatePluggyAccount(card({ balanceDueDate: '2026-10-01T02:30:00.000Z' }))?.card,
      ).toMatchObject({ dueDay: 30 });
    });

    it('has null days, limit and an `other` brand when the bank sends nothing', () => {
      expect(translatePluggyAccount(card(undefined))?.card).toEqual({
        brand: 'other',
        closingDay: null,
        dueDay: null,
        limitCents: null,
      });
      expect(translatePluggyAccount(card(null))?.card?.brand).toBe('other');
    });
  });
});
