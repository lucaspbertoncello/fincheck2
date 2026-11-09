import { describe, expect, it } from 'vitest';

import { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { BillAmountBelowPaidError } from '#/modules/bills/domain/bill/bill-amount-below-paid.error.ts';
import { BillCategoryKindMismatchError } from '#/modules/bills/domain/bill/bill-category-kind-mismatch.error.ts';
import { BillOriginNotAllowedError } from '#/modules/bills/domain/bill/bill-origin-not-allowed.error.ts';
import { BillAlreadySettledError } from '#/modules/bills/domain/bill-payment/bill-already-settled.error.ts';
import { BillOverpaidError } from '#/modules/bills/domain/bill-payment/bill-overpaid.error.ts';
import { BillPaymentNotFoundError } from '#/modules/bills/domain/bill-payment/bill-payment-not-found.error.ts';
import { BillTransactionAlreadyLinkedError } from '#/modules/bills/domain/bill-payment/bill-transaction-already-linked.error.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const LATER = '2026-11-07T15:00:00.000Z';
const expenseCategory = { id: 'cat-expense', kind: 'expense' as const, isArchived: false };
const incomeCategory = { id: 'cat-income', kind: 'income' as const, isArchived: false };

function create(patch: Partial<Bill.CreateInput> = {}): Bill {
  return Bill.create(
    {
      direction: 'payable',
      kind: 'general',
      description: 'Ingresso do show',
      counterparty: null,
      amount: Money.fromCents(45000),
      dueOn: BusinessDate.of('2026-10-31'),
      category: null,
      originTransactionId: null,
      ...patch,
    },
    NOW,
  );
}

const pay = (cents: number, transactionId: string | null = null) => ({
  transactionId,
  amount: Money.fromCents(cents),
  paidOn: BusinessDate.of('2026-11-01'),
});

describe('Bill.create', () => {
  it('creates a general bill with no person and no category', () => {
    const bill = create();

    expect(bill).toMatchObject({
      direction: 'payable',
      kind: 'general',
      counterparty: null,
      categoryId: null,
      payments: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('a friend debt needs the person', () => {
    expect(() => create({ kind: 'friend' })).toThrow(RequestValidationError);
    expect(create({ kind: 'friend', counterparty: 'Rafa' }).counterparty).toBe('Rafa');
  });

  it('the origin only fits a receivable friend debt', () => {
    const origin = { originTransactionId: 'tx-1' };

    expect(() => create({ ...origin })).toThrow(BillOriginNotAllowedError);
    expect(() => create({ ...origin, kind: 'friend', counterparty: 'Rafa' })).toThrow(
      BillOriginNotAllowedError,
    );
    expect(() => create({ ...origin, direction: 'receivable' })).toThrow(BillOriginNotAllowedError);
    expect(
      create({ ...origin, direction: 'receivable', kind: 'friend', counterparty: 'Rafa' })
        .originTransactionId,
    ).toBe('tx-1');
  });

  it('the category has the kind of the direction', () => {
    expect(create({ category: expenseCategory }).categoryId).toBe('cat-expense');
    expect(() => create({ category: incomeCategory })).toThrow(BillCategoryKindMismatchError);
    expect(create({ direction: 'receivable', category: incomeCategory }).categoryId).toBe(
      'cat-income',
    );
    expect(() => create({ direction: 'receivable', category: expenseCategory })).toThrow(
      BillCategoryKindMismatchError,
    );
  });

  it('a reimbursement (receivable friend) takes no category: it is not income', () => {
    expect(() =>
      create({
        direction: 'receivable',
        kind: 'friend',
        counterparty: 'Júlia',
        category: incomeCategory,
      }),
    ).toThrow(BillCategoryKindMismatchError);
  });

  it('refuses a value that is not positive', () => {
    expect(() => create({ amount: Money.zero() })).toThrow(RangeError);
  });
});

describe('Bill.edit', () => {
  it('changes the fields sent and clears the day and the category with null', () => {
    const bill = create({ category: expenseCategory });

    bill.edit(
      { description: 'Show', dueOn: null, category: null, amount: Money.fromCents(50000) },
      Money.zero(),
      LATER,
    );

    expect(bill).toMatchObject({
      description: 'Show',
      dueOn: null,
      categoryId: null,
      updatedAt: LATER,
    });
    expect(bill.amount.cents).toBe(50000);
  });

  it('the value can go down to exactly what was paid, not below', () => {
    const bill = create();

    bill.edit({ amount: Money.fromCents(15000) }, Money.fromCents(15000), LATER);

    expect(bill.amount.cents).toBe(15000);
    expect(() => {
      bill.edit({ amount: Money.fromCents(14999) }, Money.fromCents(15000), LATER);
    }).toThrow(BillAmountBelowPaidError);
  });

  it('refuses a category of the wrong kind', () => {
    expect(() => {
      create().edit({ category: incomeCategory }, Money.zero(), LATER);
    }).toThrow(BillCategoryKindMismatchError);
  });
});

describe('Bill.addPayment', () => {
  it('records a payment by hand and one tied to a transaction', () => {
    const bill = create();

    const first = bill.addPayment(pay(10000), Money.zero(), NOW);
    const second = bill.addPayment(pay(5000, 'tx-1'), Money.fromCents(10000), NOW);

    expect(bill.payments.map((payment) => payment.id)).toEqual([first.id, second.id]);
    expect(second.transactionId).toBe('tx-1');
  });

  it('the payment can take exactly what is missing', () => {
    const bill = create();

    expect(() => bill.addPayment(pay(45000), Money.zero(), NOW)).not.toThrow();
  });

  it('a payment one cent over what is missing is refused', () => {
    const bill = create();

    expect(() => bill.addPayment(pay(30001), Money.fromCents(15000), NOW)).toThrow(
      BillOverpaidError,
    );
  });

  it('a settled bill takes no more', () => {
    const bill = create();

    expect(() => bill.addPayment(pay(1), Money.fromCents(45000), NOW)).toThrow(
      BillAlreadySettledError,
    );
  });

  it('a transaction pays the bill once', () => {
    const bill = create();
    bill.addPayment(pay(1000, 'tx-1'), Money.zero(), NOW);

    expect(() => bill.addPayment(pay(1000, 'tx-1'), Money.fromCents(1000), NOW)).toThrow(
      BillTransactionAlreadyLinkedError,
    );
  });

  it('tying a transaction forgets that it had been dismissed for this bill', () => {
    const bill = create();
    bill.dismissPaymentSuggestion('tx-1', NOW);

    bill.addPayment(pay(1000, 'tx-1'), Money.zero(), NOW);

    expect(bill.dismissedTransactionIds).toEqual([]);
  });
});

describe('Bill.removePayment', () => {
  it('removes the payment and answers it', () => {
    const bill = create();
    const payment = bill.addPayment(pay(1000, 'tx-1'), Money.zero(), NOW);

    expect(bill.removePayment(payment.id, LATER)).toBe(payment);
    expect(bill.payments).toEqual([]);
    expect(bill.updatedAt).toBe(LATER);
  });

  it('a payment that is not on the bill is not found', () => {
    expect(() => create().removePayment('nope', LATER)).toThrow(BillPaymentNotFoundError);
  });
});

describe('Bill dismissals', () => {
  it('dismisses once and undoes; repeating either changes nothing', () => {
    const bill = create();

    bill.dismissPaymentSuggestion('tx-1', NOW);
    bill.dismissPaymentSuggestion('tx-1', LATER);
    expect(bill.dismissedTransactionIds).toEqual(['tx-1']);
    expect(bill.updatedAt).toBe(NOW);

    bill.undoDismissal('tx-1', LATER);
    bill.undoDismissal('tx-1', LATER);
    expect(bill.dismissedTransactionIds).toEqual([]);
  });
});

describe('Bill.isReimbursement', () => {
  it('only a receivable friend debt is', () => {
    expect(create().isReimbursement()).toBe(false);
    expect(create({ kind: 'friend', counterparty: 'Rafa' }).isReimbursement()).toBe(false);
    expect(
      create({ direction: 'receivable', kind: 'friend', counterparty: 'Rafa' }).isReimbursement(),
    ).toBe(true);
  });
});
