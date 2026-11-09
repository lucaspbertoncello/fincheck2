import { describe, expect, it } from 'vitest';

import type { PluggyTransaction } from '#/modules/sync/infra/pluggy/pluggy-transaction.type.ts';
import { translatePluggyTransaction } from '#/modules/sync/infra/pluggy/translate-pluggy-transaction.util.ts';

const transaction = (partial: Partial<PluggyTransaction.Response>): PluggyTransaction.Response => ({
  id: 'tx-1',
  description: 'Mercado',
  amount: 10.1,
  currencyCode: 'BRL',
  date: '2026-10-01T00:00:00.000Z',
  status: 'POSTED',
  type: 'DEBIT',
  ...partial,
});

describe('translatePluggyTransaction', () => {
  describe('checking and savings: the type decides the sign', () => {
    it.each([
      ['DEBIT', 10.1, -1010],
      ['DEBIT', -10.1, -1010],
      ['CREDIT', 10.1, 1010],
      ['CREDIT', -10.1, 1010],
    ])('%s with amount %s is %s cents', (type, amount, cents) => {
      expect(
        translatePluggyTransaction(transaction({ type, amount }), 'checking')?.amountCents,
      ).toBe(cents);
      expect(
        translatePluggyTransaction(transaction({ type, amount }), 'savings')?.amountCents,
      ).toBe(cents);
    });
  });

  describe('credit card: the sign the bank sent is flipped', () => {
    it.each([
      ['a purchase (positive) is negative', 10.1, -1010],
      ['a payment (negative) is positive', -500, 50000],
      ['a refund (negative) is positive', -29.9, 2990],
    ])('%s', (_name, amount, cents) => {
      expect(
        translatePluggyTransaction(transaction({ type: 'DEBIT', amount }), 'credit_card')
          ?.amountCents,
      ).toBe(cents);
    });

    it('ignores `type` on the card', () => {
      expect(
        translatePluggyTransaction(transaction({ type: 'CREDIT', amount: 10 }), 'credit_card')
          ?.amountCents,
      ).toBe(-1000);
    });
  });

  describe('amount in cents', () => {
    it.each([
      [10.1, 1010],
      [0.29, 29],
      [1234.56, 123456],
    ])('%s is %s', (amount, cents) => {
      expect(translatePluggyTransaction(transaction({ amount }), 'checking')?.amountCents).toBe(
        -cents,
      );
    });

    it('prefers amountInAccountCurrency when it comes', () => {
      expect(
        translatePluggyTransaction(
          transaction({ amount: 20, amountInAccountCurrency: 104.35, currencyCode: 'USD' }),
          'checking',
        )?.amountCents,
      ).toBe(-10435);
    });

    // Without `amountInAccountCurrency` a foreign amount is not reais, and no exchange rate is
    // invented: the transaction is refused (null), never read as BRL.
    it.each(['USD', 'eur'])(
      'refuses a transaction in %s that has no amountInAccountCurrency',
      (currencyCode) => {
        for (const amountInAccountCurrency of [undefined, null]) {
          expect(
            translatePluggyTransaction(
              transaction({ amount: 10, currencyCode, amountInAccountCurrency }),
              'checking',
            ),
          ).toBeNull();
          expect(
            translatePluggyTransaction(
              transaction({ amount: 10, currencyCode, amountInAccountCurrency }),
              'credit_card',
            ),
          ).toBeNull();
        }
      },
    );

    it('an installment bought in another currency has no total amount in reais', () => {
      const result = translatePluggyTransaction(
        transaction({
          amount: 20,
          amountInAccountCurrency: 104.35,
          currencyCode: 'USD',
          creditCardMetadata: { installmentNumber: 1, totalInstallments: 3, totalAmount: 60 },
        }),
        'credit_card',
      );

      expect(result?.amountCents).toBe(-10435);
      expect(result?.installment).toMatchObject({ number: 1, total: 3, totalCents: null });
    });

    it('reads a transaction with no currency said, or in BRL, as reais', () => {
      expect(
        translatePluggyTransaction(transaction({ amount: 10, currencyCode: undefined }), 'checking')
          ?.amountCents,
      ).toBe(-1000);
      expect(
        translatePluggyTransaction(transaction({ amount: 10, currencyCode: 'brl' }), 'checking')
          ?.amountCents,
      ).toBe(-1000);
    });

    it('uses amount when amountInAccountCurrency is null', () => {
      expect(
        translatePluggyTransaction(
          transaction({ amount: 20, amountInAccountCurrency: null }),
          'checking',
        )?.amountCents,
      ).toBe(-2000);
    });

    it('is null for zero', () => {
      expect(translatePluggyTransaction(transaction({ amount: 0 }), 'checking')).toBeNull();
      expect(translatePluggyTransaction(transaction({ amount: 0.004 }), 'credit_card')).toBeNull();
    });

    it('throws when the amount is not a number', () => {
      expect(() =>
        translatePluggyTransaction(transaction({ amount: '10' as never }), 'checking'),
      ).toThrow(TypeError);
    });
  });

  describe('date', () => {
    it.each([
      ['2026-10-01T00:00:00.000Z', '2026-10-01'],
      ['2026-10-01T02:30:00.000Z', '2026-09-30'],
      ['2026-10-01T03:00:00.000Z', '2026-10-01'],
      ['2026-10-02T02:59:00.000Z', '2026-10-01'],
    ])('%s is %s', (date, expected) => {
      expect(translatePluggyTransaction(transaction({ date }), 'checking')?.occurredOn).toBe(
        expected,
      );
    });

    it('throws when it is not a date', () => {
      expect(() => translatePluggyTransaction(transaction({ date: 'x' }), 'checking')).toThrow(
        TypeError,
      );
    });
  });

  describe('counterparty', () => {
    const paymentData: PluggyTransaction.Response['paymentData'] = {
      payer: { name: '  Maria Silva ' },
      receiver: { name: 'Padaria do Zé' },
    };

    it('is the payer on an incoming (credit) and the receiver on an outgoing (debit)', () => {
      expect(
        translatePluggyTransaction(transaction({ type: 'CREDIT', paymentData }), 'checking')
          ?.counterparty,
      ).toBe('Maria Silva');
      expect(
        translatePluggyTransaction(transaction({ type: 'DEBIT', paymentData }), 'checking')
          ?.counterparty,
      ).toBe('Padaria do Zé');
    });

    it('follows the final sign on the card (a payment has a payer)', () => {
      expect(
        translatePluggyTransaction(transaction({ amount: -50, paymentData }), 'credit_card')
          ?.counterparty,
      ).toBe('Maria Silva');
      expect(
        translatePluggyTransaction(transaction({ amount: 50, paymentData }), 'credit_card')
          ?.counterparty,
      ).toBe('Padaria do Zé');
    });

    it.each([
      ['no payment data', undefined],
      ['null payment data', null],
      ['no receiver', { payer: { name: 'x' } }],
      ['a blank name', { receiver: { name: '   ' } }],
      ['a null name', { receiver: { name: null } }],
    ])('is null with %s', (_name, data) => {
      expect(
        translatePluggyTransaction(transaction({ type: 'DEBIT', paymentData: data }), 'checking')
          ?.counterparty,
      ).toBeNull();
    });
  });

  describe('description', () => {
    it.each([
      ['Mercado', 'raw', 'Mercado'],
      ['  Mercado  ', 'raw', 'Mercado'],
      ['', 'MERCADO RAW', 'MERCADO RAW'],
      [null, ' MERCADO RAW ', 'MERCADO RAW'],
      ['  ', '', 'Sem descrição'],
      [undefined, undefined, 'Sem descrição'],
    ])('%j and %j give %s', (description, descriptionRaw, expected) => {
      expect(
        translatePluggyTransaction(transaction({ description, descriptionRaw }), 'checking')
          ?.description,
      ).toBe(expected);
    });
  });

  describe('method', () => {
    it('is credit on the card, pix, boleto, transfer, debit and other on the account', () => {
      const method = (
        partial: Partial<PluggyTransaction.Response>,
        type: 'checking' | 'credit_card' = 'checking',
      ) => translatePluggyTransaction(transaction(partial), type)?.method;

      expect(method({ operationType: 'PIX' }, 'credit_card')).toBe('credit');
      expect(method({ operationType: 'PIX' })).toBe('pix');
      expect(method({ paymentData: { paymentMethod: 'BOLETO' } })).toBe('boleto');
      expect(method({ operationType: 'TED' })).toBe('transfer');
      expect(method({ type: 'DEBIT' })).toBe('debit');
      expect(method({ type: 'CREDIT' })).toBe('other');
    });
  });

  describe('status, providerRef and installment', () => {
    it('maps PENDING to pending and the rest to posted', () => {
      expect(
        translatePluggyTransaction(transaction({ status: 'PENDING' }), 'checking')?.status,
      ).toBe('pending');
      expect(
        translatePluggyTransaction(transaction({ status: 'POSTED' }), 'checking')?.status,
      ).toBe('posted');
      expect(
        translatePluggyTransaction(transaction({ status: undefined }), 'checking')?.status,
      ).toBe('posted');
    });

    it('keeps the providerId, or null', () => {
      expect(
        translatePluggyTransaction(transaction({ providerId: 'open-1' }), 'checking'),
      ).toMatchObject({
        id: 'tx-1',
        providerRef: 'open-1',
      });
      expect(
        translatePluggyTransaction(transaction({ providerId: '' }), 'checking')?.providerRef,
      ).toBeNull();
      expect(translatePluggyTransaction(transaction({}), 'checking')?.providerRef).toBeNull();
    });

    it('translates the installment of a card purchase', () => {
      expect(
        translatePluggyTransaction(
          transaction({
            amount: 100,
            creditCardMetadata: {
              installmentNumber: 3,
              totalInstallments: 12,
              totalAmount: 1200,
              purchaseDate: '2026-07-10T02:30:00.000Z',
            },
          }),
          'credit_card',
        )?.installment,
      ).toEqual({ number: 3, total: 12, totalCents: 120000, purchaseOn: '2026-07-09' });
    });

    it('is null for a single payment', () => {
      expect(
        translatePluggyTransaction(
          transaction({ creditCardMetadata: { installmentNumber: 1, totalInstallments: 1 } }),
          'credit_card',
        )?.installment,
      ).toBeNull();
    });
  });

  it('throws when there is no id', () => {
    expect(() => translatePluggyTransaction(transaction({ id: '' }), 'checking')).toThrow(
      TypeError,
    );
  });
});
