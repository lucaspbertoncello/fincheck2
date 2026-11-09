import { generateId } from '#/shared/id/generate-id.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// One payment (or receipt) of a bill. `transactionId` is null for one entered by hand. It keeps
// what the transaction was worth when linked, without sign; what it is worth today is read from the
// transaction (`computePaymentCents`), so ignoring or correcting a transaction changes the paid
// amount at once, with no touch on the link.
export class BillPayment {
  readonly id: string;
  readonly transactionId: string | null;
  readonly amount: Money;
  readonly paidOn: BusinessDate;
  readonly createdAt: string;

  constructor(attr: BillPayment.Attributes) {
    this.id = attr.id ?? generateId();
    this.transactionId = attr.transactionId;
    this.amount = attr.amount;
    this.paidOn = attr.paidOn;
    this.createdAt = attr.createdAt;
  }
}

export namespace BillPayment {
  export type Attributes = {
    id?: string;
    transactionId: string | null;
    amount: Money;
    paidOn: BusinessDate;
    createdAt: string;
  };
}
