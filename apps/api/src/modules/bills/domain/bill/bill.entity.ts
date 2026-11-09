import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';

import { BillAmountBelowPaidError } from '#/modules/bills/domain/bill/bill-amount-below-paid.error.ts';
import { BillCategoryKindMismatchError } from '#/modules/bills/domain/bill/bill-category-kind-mismatch.error.ts';
import { BillOriginNotAllowedError } from '#/modules/bills/domain/bill/bill-origin-not-allowed.error.ts';
import { BillAlreadySettledError } from '#/modules/bills/domain/bill-payment/bill-already-settled.error.ts';
import { BillOverpaidError } from '#/modules/bills/domain/bill-payment/bill-overpaid.error.ts';
import { BillPaymentNotFoundError } from '#/modules/bills/domain/bill-payment/bill-payment-not-found.error.ts';
import { BillPayment } from '#/modules/bills/domain/bill-payment/bill-payment.entity.ts';
import { BillTransactionAlreadyLinkedError } from '#/modules/bills/domain/bill-payment/bill-transaction-already-linked.error.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// The root of the aggregate: a bill to pay or to receive, general or a debt with a friend, with its
// payments. What was paid is not stored here as a number: the sum of the payments is worth what the
// transactions are worth now, so the caller measures it (`BillDtoBuilder`) and passes `paid` to the
// rules that depend on it. The status is derived (`computeBillState`).
export class Bill {
  readonly id: string;
  readonly direction: BillContract.Direction;
  readonly kind: BillContract.Kind;
  description: string;
  counterparty: string | null;
  amount: Money;
  dueOn: BusinessDate | null;
  categoryId: string | null;
  // "Você pagou": the transaction in which Lucas paid what the friend owes. Never changes.
  readonly originTransactionId: string | null;
  payments: BillPayment[];
  // Transactions Lucas said are not the payment of this bill ("Não é este").
  dismissedTransactionIds: string[];
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Bill.Attributes) {
    this.id = attr.id ?? generateId();
    this.direction = attr.direction;
    this.kind = attr.kind;
    this.description = attr.description;
    this.counterparty = attr.counterparty;
    this.amount = attr.amount;
    this.dueOn = attr.dueOn;
    this.categoryId = attr.categoryId;
    this.originTransactionId = attr.originTransactionId;
    this.payments = attr.payments;
    this.dismissedTransactionIds = attr.dismissedTransactionIds;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  static create(input: Bill.CreateInput, now: string): Bill {
    if (input.amount.cents <= 0) throw new RangeError('The amount of a bill is positive');
    if (input.kind === 'friend' && !input.counterparty) {
      throw new RequestValidationError([
        { path: 'counterparty', message: 'A dívida com amigo precisa da pessoa.' },
      ]);
    }
    if (
      input.originTransactionId !== null &&
      !(input.direction === 'receivable' && input.kind === 'friend')
    ) {
      throw new BillOriginNotAllowedError();
    }
    Bill.assertCategory(input.direction, input.kind, input.category);

    return new Bill({
      direction: input.direction,
      kind: input.kind,
      description: input.description,
      counterparty: input.counterparty,
      amount: input.amount,
      dueOn: input.dueOn,
      categoryId: input.category?.id ?? null,
      originTransactionId: input.originTransactionId,
      payments: [],
      dismissedTransactionIds: [],
      createdAt: now,
    });
  }

  // A receivable friend debt is a reimbursement, not income: it takes no category and the money
  // that comes back becomes `reimbursed`.
  isReimbursement(): boolean {
    return this.direction === 'receivable' && this.kind === 'friend';
  }

  // The category of a bill has the kind of its direction (expense to pay, income to receive), and
  // there is none at all on a reimbursement.
  static assertCategory(
    direction: BillContract.Direction,
    kind: BillContract.Kind,
    category: Bill.CategoryRef | null,
  ): void {
    if (category === null) return;
    const reimbursement = direction === 'receivable' && kind === 'friend';
    const expected = direction === 'payable' ? 'expense' : 'income';
    if (reimbursement || category.kind !== expected) throw new BillCategoryKindMismatchError();
  }

  // `paid` is what was paid by now (measured by the caller).
  edit(patch: Bill.EditInput, paid: Money, now: string): void {
    if (patch.amount !== undefined) {
      if (patch.amount.cents <= 0) throw new RangeError('The amount of a bill is positive');
      if (patch.amount.cents < paid.cents) throw new BillAmountBelowPaidError();
    }
    if (patch.category !== undefined) {
      Bill.assertCategory(this.direction, this.kind, patch.category);
    }

    if (patch.description !== undefined) this.description = patch.description;
    if (patch.counterparty !== undefined) this.counterparty = patch.counterparty;
    if (patch.amount !== undefined) this.amount = patch.amount;
    if (patch.dueOn !== undefined) this.dueOn = patch.dueOn;
    if (patch.category !== undefined) this.categoryId = patch.category?.id ?? null;
    this.updatedAt = now;
  }

  // Records a payment. `paid` is what was paid before this one. A bill settled takes no more, and
  // a payment never passes what is missing. One transaction pays one bill, once.
  addPayment(
    input: { transactionId: string | null; amount: Money; paidOn: BusinessDate },
    paid: Money,
    now: string,
  ): BillPayment {
    if (input.amount.cents <= 0) throw new RangeError('The amount of a payment is positive');
    if (paid.cents >= this.amount.cents) throw new BillAlreadySettledError();
    if (paid.cents + input.amount.cents > this.amount.cents) throw new BillOverpaidError();
    if (
      input.transactionId !== null &&
      this.payments.some((payment) => payment.transactionId === input.transactionId)
    ) {
      throw new BillTransactionAlreadyLinkedError();
    }

    const payment = new BillPayment({
      transactionId: input.transactionId,
      amount: input.amount,
      paidOn: input.paidOn,
      createdAt: now,
    });
    this.payments = [...this.payments, payment];
    this.forget(input.transactionId);
    this.updatedAt = now;

    return payment;
  }

  removePayment(paymentId: string, now: string): BillPayment {
    const payment = this.payments.find((candidate) => candidate.id === paymentId);
    if (!payment) throw new BillPaymentNotFoundError();

    this.payments = this.payments.filter((candidate) => candidate.id !== paymentId);
    this.updatedAt = now;

    return payment;
  }

  dismissPaymentSuggestion(transactionId: string, now: string): void {
    if (this.dismissedTransactionIds.includes(transactionId)) return;
    this.dismissedTransactionIds = [...this.dismissedTransactionIds, transactionId];
    this.updatedAt = now;
  }

  undoDismissal(transactionId: string, now: string): void {
    if (!this.dismissedTransactionIds.includes(transactionId)) return;
    this.forget(transactionId);
    this.updatedAt = now;
  }

  private forget(transactionId: string | null): void {
    if (transactionId === null) return;
    this.dismissedTransactionIds = this.dismissedTransactionIds.filter(
      (id) => id !== transactionId,
    );
  }
}

export namespace Bill {
  export type CategoryRef = { id: string; kind: 'expense' | 'income'; isArchived: boolean };

  export type Attributes = {
    id?: string;
    direction: BillContract.Direction;
    kind: BillContract.Kind;
    description: string;
    counterparty: string | null;
    amount: Money;
    dueOn: BusinessDate | null;
    categoryId: string | null;
    originTransactionId: string | null;
    payments: BillPayment[];
    dismissedTransactionIds: string[];
    createdAt: string;
    updatedAt?: string;
  };

  export type CreateInput = {
    direction: BillContract.Direction;
    kind: BillContract.Kind;
    description: string;
    counterparty: string | null;
    amount: Money;
    dueOn: BusinessDate | null;
    category: CategoryRef | null;
    originTransactionId: string | null;
  };

  export type EditInput = {
    description?: string;
    counterparty?: string;
    amount?: Money;
    dueOn?: BusinessDate | null;
    category?: CategoryRef | null;
  };
}
