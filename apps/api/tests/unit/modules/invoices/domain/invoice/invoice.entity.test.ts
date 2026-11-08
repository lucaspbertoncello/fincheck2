import { describe, expect, it } from 'vitest';

import { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import { InvoiceNotEditableError } from '#/modules/invoices/domain/invoice/invoice-not-editable.error.ts';
import { InvoiceNotPayableError } from '#/modules/invoices/domain/invoice/invoice-not-payable.error.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { InvoicePayment } from '#/modules/invoices/domain/invoice-payment/invoice-payment.entity.ts';
import { InvoicePaymentNotFoundError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-not-found.error.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-07T09:00:00.000Z';

const cents = (value: number) => Money.fromCents(value);

function buildInvoice(overrides: Partial<Invoice.Attributes> = {}): Invoice {
  return new Invoice({
    accountId: 'card-1',
    month: Month.of('2026-10'),
    closesOn: BusinessDate.of('2026-10-30'),
    dueOn: BusinessDate.of('2026-11-06'),
    bankTotal: null,
    totalOverride: null,
    overrideNote: null,
    payments: [],
    dismissedTransactionIds: [],
    createdAt: NOW,
    ...overrides,
  });
}

describe('Invoice.open', () => {
  it('writes the dates the cycle of the card gives', () => {
    const invoice = Invoice.open(
      {
        accountId: 'card-1',
        month: Month.of('2026-10'),
        cycle: new InvoiceCycle(30, 6),
        calendar: new BusinessCalendar(),
      },
      NOW,
    );

    expect(invoice.closesOn.value).toBe('2026-10-30');
    expect(invoice.dueOn.value).toBe('2026-11-06');
  });

  it('moves the due date to a business day', () => {
    const invoice = Invoice.open(
      {
        accountId: 'card-1',
        month: Month.of('2026-11'),
        cycle: new InvoiceCycle(30, 6),
        calendar: new BusinessCalendar(),
      },
      NOW,
    );

    expect(invoice.closesOn.value).toBe('2026-11-30');
    expect(invoice.dueOn.value).toBe('2026-12-07');
  });

  it('is born empty, with a generated id and the timestamps of the call', () => {
    const invoice = Invoice.open(
      {
        accountId: 'card-1',
        month: Month.of('2026-10'),
        cycle: new InvoiceCycle(30, 6),
        calendar: new BusinessCalendar(),
      },
      NOW,
    );

    expect(invoice.id).toBeTruthy();
    expect(invoice).toMatchObject({
      accountId: 'card-1',
      bankTotal: null,
      totalOverride: null,
      overrideNote: null,
      payments: [],
      dismissedTransactionIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(invoice.month.value).toBe('2026-10');
  });
});

describe('Invoice.correctTotal', () => {
  it('sets the correction with a note', () => {
    const invoice = buildInvoice();

    invoice.correctTotal({ totalOverride: cents(9800), overrideNote: 'Bank app' }, 'past', LATER);

    expect(invoice.totalOverride?.cents).toBe(9800);
    expect(invoice.overrideNote).toBe('Bank app');
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('accepts a correction of zero', () => {
    const invoice = buildInvoice();

    invoice.correctTotal({ totalOverride: cents(0) }, 'current', LATER);

    expect(invoice.totalOverride?.cents).toBe(0);
  });

  it('keeps the note when a new total comes without one', () => {
    const invoice = buildInvoice({ totalOverride: cents(5000), overrideNote: 'First note' });

    invoice.correctTotal({ totalOverride: cents(6000) }, 'past', LATER);

    expect(invoice.totalOverride?.cents).toBe(6000);
    expect(invoice.overrideNote).toBe('First note');
  });

  it('clears the note when a new total comes with a null note', () => {
    const invoice = buildInvoice({ totalOverride: cents(5000), overrideNote: 'First note' });

    invoice.correctTotal({ totalOverride: cents(6000), overrideNote: null }, 'past', LATER);

    expect(invoice.overrideNote).toBeNull();
  });

  it('clears the correction and its note with a null total', () => {
    const invoice = buildInvoice({ totalOverride: cents(5000), overrideNote: 'First note' });

    invoice.correctTotal({ totalOverride: null }, 'past', LATER);

    expect(invoice.totalOverride).toBeNull();
    expect(invoice.overrideNote).toBeNull();
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('clears the note even when a null total comes with a new note', () => {
    const invoice = buildInvoice({ totalOverride: cents(5000), overrideNote: 'First note' });

    invoice.correctTotal({ totalOverride: null, overrideNote: 'Ignored' }, 'past', LATER);

    expect(invoice.totalOverride).toBeNull();
    expect(invoice.overrideNote).toBeNull();
  });

  it('ignores a note alone when there is no correction', () => {
    const invoice = buildInvoice();

    invoice.correctTotal({ overrideNote: 'Lonely note' }, 'past', LATER);

    expect(invoice.totalOverride).toBeNull();
    expect(invoice.overrideNote).toBeNull();
  });

  it('replaces the note alone when a correction exists', () => {
    const invoice = buildInvoice({ totalOverride: cents(5000), overrideNote: 'First note' });

    invoice.correctTotal({ overrideNote: 'Second note' }, 'past', LATER);

    expect(invoice.totalOverride?.cents).toBe(5000);
    expect(invoice.overrideNote).toBe('Second note');
  });

  it('refuses a projected invoice and changes nothing', () => {
    const invoice = buildInvoice();

    expect(() => invoice.correctTotal({ totalOverride: cents(100) }, 'projected', LATER)).toThrow(
      InvoiceNotEditableError,
    );
    expect(invoice.totalOverride).toBeNull();
    expect(invoice.updatedAt).toBe(NOW);
  });
});

describe('Invoice.registerPayment', () => {
  it('adds a payment and returns it', () => {
    const invoice = buildInvoice();

    const payment = invoice.registerPayment(
      { amount: cents(5000), paidOn: BusinessDate.of('2026-11-05'), transactionId: 'tx-1' },
      'past',
      LATER,
    );

    expect(invoice.payments).toEqual([payment]);
    expect(payment).toBeInstanceOf(InvoicePayment);
    expect(payment).toMatchObject({ transactionId: 'tx-1', createdAt: LATER });
    expect(payment.amount.cents).toBe(5000);
    expect(payment.paidOn.value).toBe('2026-11-05');
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('adds a payment by hand, with no transaction', () => {
    const invoice = buildInvoice();

    const payment = invoice.registerPayment(
      { amount: cents(1000), paidOn: BusinessDate.of('2026-11-05'), transactionId: null },
      'current',
      LATER,
    );

    expect(payment.transactionId).toBeNull();
    expect(invoice.payments).toHaveLength(1);
  });

  it('keeps the payments already there', () => {
    const first = new InvoicePayment({
      amount: cents(100),
      paidOn: BusinessDate.of('2026-11-01'),
      transactionId: null,
      createdAt: NOW,
    });
    const invoice = buildInvoice({ payments: [first] });

    const second = invoice.registerPayment(
      { amount: cents(200), paidOn: BusinessDate.of('2026-11-02'), transactionId: null },
      'past',
      LATER,
    );

    expect(invoice.payments).toEqual([first, second]);
  });

  it('takes the transaction off the dismissed ones', () => {
    const invoice = buildInvoice({ dismissedTransactionIds: ['tx-1', 'tx-2'] });

    invoice.registerPayment(
      { amount: cents(5000), paidOn: BusinessDate.of('2026-11-05'), transactionId: 'tx-1' },
      'past',
      LATER,
    );

    expect(invoice.dismissedTransactionIds).toEqual(['tx-2']);
  });

  it('leaves the dismissed ones alone for a payment by hand', () => {
    const invoice = buildInvoice({ dismissedTransactionIds: ['tx-1'] });

    invoice.registerPayment(
      { amount: cents(5000), paidOn: BusinessDate.of('2026-11-05'), transactionId: null },
      'past',
      LATER,
    );

    expect(invoice.dismissedTransactionIds).toEqual(['tx-1']);
  });

  it('refuses a projected invoice and changes nothing', () => {
    const invoice = buildInvoice();

    expect(() =>
      invoice.registerPayment(
        { amount: cents(5000), paidOn: BusinessDate.of('2026-11-05'), transactionId: null },
        'projected',
        LATER,
      ),
    ).toThrow(InvoiceNotPayableError);
    expect(invoice.payments).toEqual([]);
    expect(invoice.updatedAt).toBe(NOW);
  });
});

describe('Invoice.removePayment', () => {
  function withPayments() {
    const first = new InvoicePayment({
      id: 'pay-1',
      amount: cents(100),
      paidOn: BusinessDate.of('2026-11-01'),
      transactionId: 'tx-1',
      createdAt: NOW,
    });
    const second = new InvoicePayment({
      id: 'pay-2',
      amount: cents(200),
      paidOn: BusinessDate.of('2026-11-02'),
      transactionId: null,
      createdAt: NOW,
    });

    return { first, second, invoice: buildInvoice({ payments: [first, second] }) };
  }

  it('removes the payment and returns it', () => {
    const { first, second, invoice } = withPayments();

    const removed = invoice.removePayment('pay-1', LATER);

    expect(removed).toBe(first);
    expect(invoice.payments).toEqual([second]);
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('throws when the payment is not in this invoice and changes nothing', () => {
    const { invoice } = withPayments();

    expect(() => invoice.removePayment('pay-9', LATER)).toThrow(InvoicePaymentNotFoundError);
    expect(invoice.payments).toHaveLength(2);
    expect(invoice.updatedAt).toBe(NOW);
  });
});

describe('Invoice.dismissPaymentSuggestion and undoDismissal', () => {
  it('dismisses a transaction', () => {
    const invoice = buildInvoice();

    invoice.dismissPaymentSuggestion('tx-1', LATER);

    expect(invoice.dismissedTransactionIds).toEqual(['tx-1']);
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('is idempotent when dismissing again: no duplicate and no new timestamp', () => {
    const invoice = buildInvoice({ dismissedTransactionIds: ['tx-1'] });

    invoice.dismissPaymentSuggestion('tx-1', LATER);

    expect(invoice.dismissedTransactionIds).toEqual(['tx-1']);
    expect(invoice.updatedAt).toBe(NOW);
  });

  it('undoes a dismissal', () => {
    const invoice = buildInvoice({ dismissedTransactionIds: ['tx-1', 'tx-2'] });

    invoice.undoDismissal('tx-1', LATER);

    expect(invoice.dismissedTransactionIds).toEqual(['tx-2']);
    expect(invoice.updatedAt).toBe(LATER);
  });

  it('is idempotent when undoing a transaction that was not dismissed', () => {
    const invoice = buildInvoice({ dismissedTransactionIds: ['tx-2'] });

    invoice.undoDismissal('tx-1', LATER);

    expect(invoice.dismissedTransactionIds).toEqual(['tx-2']);
    expect(invoice.updatedAt).toBe(NOW);
  });
});
