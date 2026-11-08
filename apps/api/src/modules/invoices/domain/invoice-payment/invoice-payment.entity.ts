import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// One payment of an invoice, total or partial: how much it settled, when, and the debit (or card
// credit) that paid it. Without a transaction it was registered by hand. Part of the `Invoice`
// aggregate; immutable once registered (to fix it, remove and register again).
export class InvoicePayment {
  readonly id: string;
  readonly amount: Money;
  readonly paidOn: BusinessDate;
  readonly transactionId: string | null;
  readonly createdAt: string;

  constructor(attr: InvoicePayment.Attributes) {
    this.id = attr.id ?? generateId();
    this.amount = attr.amount;
    this.paidOn = attr.paidOn;
    this.transactionId = attr.transactionId;
    this.createdAt = attr.createdAt;
  }
}

export namespace InvoicePayment {
  export type Attributes = {
    id?: string;
    amount: Money;
    paidOn: BusinessDate;
    transactionId: string | null;
    createdAt: string;
  };
}
