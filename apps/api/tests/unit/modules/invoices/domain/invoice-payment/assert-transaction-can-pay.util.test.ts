import { describe, expect, it } from 'vitest';

import { assertTransactionCanPay } from '#/modules/invoices/domain/invoice-payment/assert-transaction-can-pay.util.ts';
import { InvoicePaymentTransactionInvalidError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-transaction-invalid.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const CARD = 'card-1';

type Transaction = Parameters<typeof assertTransactionCanPay>[0]['transaction'];

function run(overrides: { transaction?: Partial<Transaction>; amount?: number } = {}) {
  assertTransactionCanPay({
    transaction: {
      accountId: 'checking-1',
      amount: Money.fromCents(-10000),
      nature: 'expense',
      isSplit: false,
      counts: true,
      ...overrides.transaction,
    },
    cardAccountId: CARD,
    amount: Money.fromCents(overrides.amount ?? 10000),
  });
}

function expectInvalid(fn: () => void, reason: string) {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(InvoicePaymentTransactionInvalidError);
  expect((thrown as InvoicePaymentTransactionInvalidError).code).toBe(
    'INVOICE_PAYMENT_TRANSACTION_INVALID',
  );
  expect((thrown as InvoicePaymentTransactionInvalidError).message).toContain(reason);
}

describe('assertTransactionCanPay: valid', () => {
  it('accepts a debit of another account', () => {
    expect(() => run()).not.toThrow();
  });

  it('accepts a credit of the card itself', () => {
    expect(() =>
      run({ transaction: { accountId: CARD, amount: Money.fromCents(10000), nature: 'expense' } }),
    ).not.toThrow();
  });

  it('accepts an amount equal to the value of the transaction', () => {
    expect(() => run({ amount: 10000 })).not.toThrow();
  });

  it('accepts an amount below the value of the transaction', () => {
    expect(() => run({ amount: 1 })).not.toThrow();
  });

  it.each(['expense', 'income', 'invoice_payment'])('accepts the nature %s', (nature) => {
    expect(() => run({ transaction: { nature } })).not.toThrow();
  });
});

describe('assertTransactionCanPay: invalid', () => {
  it('refuses a transaction that does not count (ignored or removed by the bank)', () => {
    expectInvalid(() => run({ transaction: { counts: false } }), 'ignorada');
  });

  it('refuses a split transaction', () => {
    expectInvalid(() => run({ transaction: { isSplit: true } }), 'dividida');
  });

  it.each(['transfer', 'lent', 'reimbursed', 'balance_adjustment'])(
    'refuses the nature %s',
    (nature) => {
      expectInvalid(() => run({ transaction: { nature } }), 'outro papel');
    },
  );

  it('refuses an outgoing of the account of the card itself', () => {
    expectInvalid(
      () => run({ transaction: { accountId: CARD, amount: Money.fromCents(-10000) } }),
      'saída de uma conta sua',
    );
  });

  it('refuses a credit of another account', () => {
    expectInvalid(
      () => run({ transaction: { accountId: 'checking-1', amount: Money.fromCents(10000) } }),
      'saída de uma conta sua',
    );
  });

  it('refuses a transaction of value zero', () => {
    expectInvalid(
      () => run({ transaction: { accountId: CARD, amount: Money.fromCents(0) } }),
      'saída de uma conta sua',
    );
    expectInvalid(
      () =>
        run({ transaction: { accountId: 'checking-1', amount: Money.fromCents(0) }, amount: 0 }),
      'saída de uma conta sua',
    );
  });

  it('refuses an amount above the value of the transaction', () => {
    expectInvalid(() => run({ amount: 10001 }), 'passa do valor');
  });

  it('compares the amount with the absolute value of a credit of the card', () => {
    expect(() =>
      run({
        transaction: { accountId: CARD, amount: Money.fromCents(10000) },
        amount: 10000,
      }),
    ).not.toThrow();
    expectInvalid(
      () =>
        run({ transaction: { accountId: CARD, amount: Money.fromCents(10000) }, amount: 10001 }),
      'passa do valor',
    );
  });
});
