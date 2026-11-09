import { describe, expect, it } from 'vitest';

import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestBankTransaction } from '#tests/support/transactions/transaction/build-test-bank-transaction.util.ts';

const NOW = '2026-11-09T15:00:00.000Z';

const bank = (cents: number, overrides: Partial<Transaction.BankVersion> = {}) => ({
  description: 'MERCADO CENTRAL',
  amount: Money.fromCents(cents),
  occurredOn: BusinessDate.of('2026-11-05'),
  counterparty: null,
  status: 'posted' as const,
  ...overrides,
});

const checking = { id: 'checking-1', isCard: false, isArchived: false };
const card = { id: 'card-1', isCard: true, isArchived: false };

describe('Transaction.createFromBank', () => {
  it('is born with the bank version in use: not edited, origin bank, the system owns the nature', () => {
    const transaction = Transaction.createFromBank(
      {
        account: checking,
        method: 'pix',
        bank: bank(-15990),
        invoiceMonth: null,
        installment: null,
      },
      NOW,
    );

    expect(transaction).toMatchObject({
      origin: 'bank',
      nature: 'expense',
      natureSetBy: 'system',
      description: 'MERCADO CENTRAL',
      invoiceMonth: null,
      categoryId: null,
      createdAt: NOW,
    });
    expect(transaction.amount.cents).toBe(-15990);
    expect(transaction.isEdited()).toBe(false);
    expect(transaction.bank?.amount.cents).toBe(-15990);
  });

  it('a credit on a checking account is an income', () => {
    const transaction = Transaction.createFromBank(
      {
        account: checking,
        method: 'transfer',
        bank: bank(500000),
        invoiceMonth: null,
        installment: null,
      },
      NOW,
    );

    expect(transaction.nature).toBe('income');
  });

  it('on a card every entry is an expense, even the positive one (a refund never becomes income)', () => {
    const purchase = Transaction.createFromBank(
      {
        account: card,
        method: 'credit',
        bank: bank(-8900),
        invoiceMonth: Month.of('2026-11'),
        installment: null,
      },
      NOW,
    );
    const refund = Transaction.createFromBank(
      {
        account: card,
        method: 'credit',
        bank: bank(8900),
        invoiceMonth: Month.of('2026-11'),
        installment: null,
      },
      NOW,
    );

    expect(purchase.nature).toBe('expense');
    expect(refund.nature).toBe('expense');
    expect(refund.amount.cents).toBe(8900);
  });

  it('refuses a zero amount', () => {
    expect(() =>
      Transaction.createFromBank(
        { account: checking, method: 'pix', bank: bank(0), invoiceMonth: null, installment: null },
        NOW,
      ),
    ).toThrow(RangeError);
  });

  it('only a card purchase has an invoice month', () => {
    expect(() =>
      Transaction.createFromBank(
        {
          account: card,
          method: 'credit',
          bank: bank(-100),
          invoiceMonth: null,
          installment: null,
        },
        NOW,
      ),
    ).toThrow(RangeError);
    expect(() =>
      Transaction.createFromBank(
        {
          account: checking,
          method: 'pix',
          bank: bank(-100),
          invoiceMonth: Month.of('2026-11'),
          installment: null,
        },
        NOW,
      ),
    ).toThrow(RangeError);
  });

  it('keeps the installment of the plan', () => {
    const transaction = Transaction.createFromBank(
      {
        account: card,
        method: 'credit',
        bank: bank(-10000),
        invoiceMonth: Month.of('2026-12'),
        installment: { planId: 'plan-1', number: 3 },
      },
      NOW,
    );

    expect(transaction.installment).toEqual({ planId: 'plan-1', number: 3 });
  });
});

describe('Transaction.applyDetectedNature', () => {
  it('turns what the system owns into a payment of invoice and takes its category away', () => {
    const transaction = buildTestBankTransaction({
      categoryId: 'category-1',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
    });

    const changed = transaction.applyDetectedNature('invoice_payment', NOW);

    expect(changed).toBe(true);
    expect(transaction).toMatchObject({
      nature: 'invoice_payment',
      natureSetBy: 'system',
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      updatedAt: NOW,
    });
  });

  it('turns an income into a transfer', () => {
    const transaction = buildTestBankTransaction({
      nature: 'income',
      amount: Money.fromCents(10000),
    });

    expect(transaction.applyDetectedNature('transfer', NOW)).toBe(true);
    expect(transaction.nature).toBe('transfer');
  });

  it('never undoes what Lucas chose', () => {
    const transaction = buildTestBankTransaction({ natureSetBy: 'user' });

    expect(transaction.applyDetectedNature('invoice_payment', NOW)).toBe(false);
    expect(transaction.nature).toBe('expense');
  });

  it.each(['transfer', 'balance_adjustment', 'lent', 'reimbursed'] as const)(
    'leaves a nature that owns a flow (%s) as it is',
    (nature) => {
      const transaction = buildTestBankTransaction({ nature });

      expect(transaction.applyDetectedNature('invoice_payment', NOW)).toBe(false);
      expect(transaction.nature).toBe(nature);
    },
  );

  it('does nothing when the nature is already the one found (idempotent)', () => {
    const transaction = buildTestBankTransaction({ nature: 'invoice_payment' });

    expect(transaction.applyDetectedNature('invoice_payment', NOW)).toBe(false);
  });

  it('canTakeDetectedNature says the same, without changing anything', () => {
    expect(buildTestBankTransaction().canTakeDetectedNature()).toBe(true);
    expect(buildTestBankTransaction({ natureSetBy: 'user' }).canTakeDetectedNature()).toBe(false);
    expect(buildTestBankTransaction({ nature: 'lent' }).canTakeDetectedNature()).toBe(false);
  });
});

describe('Transaction.linkDetectedTransfer', () => {
  it('makes the two legs point at each other', () => {
    const debit = buildTestBankTransaction({ id: 'debit' });
    const credit = buildTestBankTransaction({ id: 'credit', amount: Money.fromCents(1250) });

    Transaction.linkDetectedTransfer(debit, credit, NOW);

    expect(debit.transferCounterpartId).toBe('credit');
    expect(credit.transferCounterpartId).toBe('debit');
  });
});

describe('Transaction.inheritChoices', () => {
  it('takes the category and the tags of the parcel it replaces', () => {
    const transaction = buildTestBankTransaction();

    transaction.inheritChoices(
      {
        categoryId: 'category-1',
        categorySource: 'user',
        categoryRuleId: null,
        tagIds: ['t1', 't1', 't2'],
      },
      NOW,
    );

    expect(transaction).toMatchObject({
      categoryId: 'category-1',
      categorySource: 'user',
      tagIds: ['t1', 't2'],
    });
  });

  it('keeps no category on a nature that has none, but keeps the tags', () => {
    const transaction = buildTestBankTransaction({ nature: 'transfer' });

    transaction.inheritChoices(
      { categoryId: 'category-1', categorySource: 'user', categoryRuleId: null, tagIds: ['t1'] },
      NOW,
    );

    expect(transaction.categoryId).toBeNull();
    expect(transaction.tagIds).toEqual(['t1']);
  });
});
