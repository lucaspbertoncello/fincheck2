import type { InvoicePhase } from '#/modules/invoices/domain/invoice/compute-invoice-phase.util.ts';
import { InvoiceNotEditableError } from '#/modules/invoices/domain/invoice/invoice-not-editable.error.ts';
import { InvoiceNotPayableError } from '#/modules/invoices/domain/invoice/invoice-not-payable.error.ts';
import type { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { InvoicePayment } from '#/modules/invoices/domain/invoice-payment/invoice-payment.entity.ts';
import { InvoicePaymentNotFoundError } from '#/modules/invoices/domain/invoice-payment/invoice-payment-not-found.error.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// The invoice of a card in a month (named by the month of the closing). The row is born when
// something is written on it (a correction, a payment, the dismissal of a suggestion); before
// that the invoice is only calculated. The root keeps what cannot be derived: the cycle dates
// (written when it is born, so changing the closing day of the card does not move invoices that
// exist), the total of the bank, the correction of Lucas, the payments and the transactions he
// dismissed as "not this one". The total, the paid amount and the state are never stored: they come
// from `InvoiceStatement`.
export class Invoice {
  readonly id: string;
  readonly accountId: string;
  readonly month: Month;
  readonly closesOn: BusinessDate;
  readonly dueOn: BusinessDate;
  bankTotal: Money | null;
  totalOverride: Money | null;
  overrideNote: string | null;
  payments: InvoicePayment[];
  dismissedTransactionIds: string[];
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Invoice.Attributes) {
    this.id = attr.id ?? generateId();
    this.accountId = attr.accountId;
    this.month = attr.month;
    this.closesOn = attr.closesOn;
    this.dueOn = attr.dueOn;
    this.bankTotal = attr.bankTotal;
    this.totalOverride = attr.totalOverride;
    this.overrideNote = attr.overrideNote;
    this.payments = attr.payments;
    this.dismissedTransactionIds = attr.dismissedTransactionIds;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // A new row, with the dates the cycle of the card gives today.
  static open(
    input: { accountId: string; month: Month; cycle: InvoiceCycle; calendar: BusinessCalendar },
    now: string,
  ): Invoice {
    return new Invoice({
      accountId: input.accountId,
      month: input.month,
      closesOn: input.cycle.closesOn(input.month),
      dueOn: input.cycle.dueOn(input.month, input.calendar),
      bankTotal: null,
      totalOverride: null,
      overrideNote: null,
      payments: [],
      dismissedTransactionIds: [],
      createdAt: now,
    });
  }

  // "Corrigir valor" (BR-INV-004). `totalOverride: null` clears the correction and its note (the
  // total goes back to the bank's or to the calculated one); `0` is a valid correction. Without a
  // total in the change, a note alone only replaces the note of a correction that exists.
  correctTotal(
    change: { totalOverride?: Money | null; overrideNote?: string | null },
    phase: InvoicePhase,
    now: string,
  ): void {
    if (phase === 'projected') throw new InvoiceNotEditableError();

    if (change.totalOverride === null) {
      this.totalOverride = null;
      this.overrideNote = null;
    } else if (change.totalOverride !== undefined) {
      this.totalOverride = change.totalOverride;
      if (change.overrideNote !== undefined) this.overrideNote = change.overrideNote;
    } else if (change.overrideNote !== undefined && this.totalOverride !== null) {
      this.overrideNote = change.overrideNote;
    }
    this.updatedAt = now;
  }

  // Total or partial payment, tied to a transaction or by hand. May pass what is left: the invoice
  // is then paid and the card keeps a credit (I4). A transaction pays one invoice only; whether it
  // may pay this one is checked by the caller, who knows the transaction.
  registerPayment(
    input: { amount: Money; paidOn: BusinessDate; transactionId: string | null },
    phase: InvoicePhase,
    now: string,
  ): InvoicePayment {
    if (phase === 'projected') throw new InvoiceNotPayableError();

    const payment = new InvoicePayment({ ...input, createdAt: now });
    this.payments = [...this.payments, payment];
    if (input.transactionId !== null) {
      this.dismissedTransactionIds = this.dismissedTransactionIds.filter(
        (id) => id !== input.transactionId,
      );
    }
    this.updatedAt = now;

    return payment;
  }

  removePayment(paymentId: string, now: string): InvoicePayment {
    const payment = this.payments.find((candidate) => candidate.id === paymentId);
    if (!payment) throw new InvoicePaymentNotFoundError();

    this.payments = this.payments.filter((candidate) => candidate.id !== paymentId);
    this.updatedAt = now;

    return payment;
  }

  // "Não é este": the transaction stops being a candidate for this invoice (I1).
  dismissPaymentSuggestion(transactionId: string, now: string): void {
    if (this.dismissedTransactionIds.includes(transactionId)) return;

    this.dismissedTransactionIds = [...this.dismissedTransactionIds, transactionId];
    this.updatedAt = now;
  }

  undoDismissal(transactionId: string, now: string): void {
    if (!this.dismissedTransactionIds.includes(transactionId)) return;

    this.dismissedTransactionIds = this.dismissedTransactionIds.filter(
      (id) => id !== transactionId,
    );
    this.updatedAt = now;
  }
}

export namespace Invoice {
  export type Attributes = {
    id?: string;
    accountId: string;
    month: Month;
    closesOn: BusinessDate;
    dueOn: BusinessDate;
    bankTotal: Money | null;
    totalOverride: Money | null;
    overrideNote: string | null;
    payments: InvoicePayment[];
    dismissedTransactionIds: string[];
    createdAt: string;
    updatedAt?: string;
  };
}
