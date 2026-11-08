import type { Invoice as InvoiceContract } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { InvoicePhase } from '#/modules/invoices/domain/invoice/compute-invoice-phase.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The figures of an invoice, all derived (BR-INV-002: the total is never stored). Pure: the caller
// brings the sums of the cycle and the paid amount, this works out the total, the state and what
// is left to pay, so the rules are tested without a database.
export class InvoiceStatement {
  readonly purchases: Money;
  readonly installments: Money;
  readonly expectedRecurring: Money;
  readonly computedTotal: Money;
  readonly total: Money;
  readonly paid: Money;
  readonly status: InvoiceContract.Status;

  private constructor(attr: InvoiceStatement.Attributes) {
    this.purchases = attr.purchases;
    this.installments = attr.installments;
    this.expectedRecurring = attr.expectedRecurring;
    this.computedTotal = attr.computedTotal;
    this.total = attr.total;
    this.paid = attr.paid;
    this.status = attr.status;
  }

  static compute(input: InvoiceStatement.Input): InvoiceStatement {
    // The recurrences foreseen only count while the invoice has not closed: in the open one and in
    // the projected ones. Once the month is past, the real charges are in the purchases.
    const expectedRecurring = input.phase === 'past' ? Money.zero() : input.expectedRecurring;
    // No floor: refunds bigger than the purchases make a negative total, a credit of the card.
    const computedTotal = input.purchases.add(input.installments).add(expectedRecurring);
    const total = input.totalOverride ?? input.bankTotal ?? computedTotal;

    return new InvoiceStatement({
      purchases: input.purchases,
      installments: input.installments,
      expectedRecurring,
      computedTotal,
      total,
      paid: input.paid,
      status: InvoiceStatement.statusOf(input, total),
    });
  }

  // What still has to leave the account: the total minus what is paid and what is presumed paid
  // (a found payment that is safe, which already left the bank balance), never below zero.
  remaining(presumedPaid: Money): Money {
    const left = this.total.subtract(this.paid).subtract(presumedPaid);

    return left.isNegative() ? Money.zero() : left;
  }

  // What the total still lacks, before the presumed payment: the base of the payment found.
  unpaid(): Money {
    return this.remaining(Money.zero());
  }

  // The first condition that holds wins (`today` is the day of the clock in America/Sao_Paulo).
  private static statusOf(input: InvoiceStatement.Input, total: Money): InvoiceContract.Status {
    const afterClosing = input.closesOn.isBefore(input.today);
    const paidAll = input.paid.cents >= total.cents;

    if (input.phase === 'projected') return 'projected';
    if (paidAll && (input.paid.cents > 0 || afterClosing)) return 'paid';
    if (input.dueOn.isBefore(input.today)) return 'overdue';
    if (input.paid.cents > 0) return 'partial';
    if (afterClosing) return 'closed';

    return 'open';
  }
}

export namespace InvoiceStatement {
  export type Attributes = {
    purchases: Money;
    installments: Money;
    expectedRecurring: Money;
    computedTotal: Money;
    total: Money;
    paid: Money;
    status: InvoiceContract.Status;
  };

  export type Input = {
    phase: InvoicePhase;
    today: BusinessDate;
    closesOn: BusinessDate;
    dueOn: BusinessDate;
    // Sums of the cycle, positive = spending, a refund lowers them.
    purchases: Money;
    installments: Money;
    expectedRecurring: Money;
    bankTotal: Money | null;
    totalOverride: Money | null;
    // What the payments settled: each one at most the current value of its transaction.
    paid: Money;
  };
}
