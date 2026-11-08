import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { OccurrenceWindow } from '#/modules/recurrences/domain/occurrence/compute-occurrence-window.util.ts';
import { OccurrenceAlreadySettledError } from '#/modules/recurrences/domain/occurrence/occurrence-already-settled.error.ts';
import { OccurrenceAlreadySkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-already-skipped.error.ts';
import { OccurrenceNoDifferenceError } from '#/modules/recurrences/domain/occurrence/occurrence-no-difference.error.ts';
import { OccurrenceNotSettledError } from '#/modules/recurrences/domain/occurrence/occurrence-not-settled.error.ts';
import { OccurrenceNotSkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-not-skipped.error.ts';
import { OccurrenceSkippedError } from '#/modules/recurrences/domain/occurrence/occurrence-skipped.error.ts';
import { OccurrencePayment } from '#/modules/recurrences/domain/occurrence-payment/occurrence-payment.entity.ts';
import { OccurrencePaymentNotFoundError } from '#/modules/recurrences/domain/occurrence-payment/occurrence-payment-not-found.error.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// The turn of a recurrence in one month: the day it is expected, the window in which a transaction
// may match it, the amount expected this month and the payments that settled it. There is one per
// recurrence and month. Its state (expected, partial, late, confirmed, skipped) and its difference
// are never stored: they come from the payments, the dates and the two marks, through
// `computeOccurrenceState`.
//
// "Settle" and "skip" are manual marks. A settled occurrence is no money in, no money out: it only
// leaves the projection (Q6). A skipped one will not happen this month (Q7).
export class Occurrence {
  readonly id: string;
  readonly recurrenceId: string;
  readonly month: Month;
  expectedOn: BusinessDate | null;
  windowStartOn: BusinessDate;
  windowEndOn: BusinessDate;
  // The amount expected this month: editing the recurrence "from here on" never moves past months.
  expectedAmount: Money;
  settledAt: string | null;
  skippedAt: string | null;
  differenceDecision: OccurrenceContract.Decision | null;
  payments: OccurrencePayment[];
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Occurrence.Attributes) {
    this.id = attr.id ?? generateId();
    this.recurrenceId = attr.recurrenceId;
    this.month = attr.month;
    this.expectedOn = attr.expectedOn;
    this.windowStartOn = attr.windowStartOn;
    this.windowEndOn = attr.windowEndOn;
    this.expectedAmount = attr.expectedAmount;
    this.settledAt = attr.settledAt;
    this.skippedAt = attr.skippedAt;
    this.differenceDecision = attr.differenceDecision;
    this.payments = attr.payments;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // BR-REC-005: an occurrence is born expected, with the amount and the window the recurrence gives.
  static open(
    input: { recurrenceId: string; month: Month; expectedAmount: Money; window: OccurrenceWindow },
    now: string,
  ): Occurrence {
    return new Occurrence({
      recurrenceId: input.recurrenceId,
      month: input.month,
      expectedOn: input.window.expectedOn,
      windowStartOn: input.window.windowStartOn,
      windowEndOn: input.window.windowEndOn,
      expectedAmount: input.expectedAmount,
      settledAt: null,
      skippedAt: null,
      differenceDecision: null,
      payments: [],
      createdAt: now,
    });
  }

  // No payment and no mark: the only kind a change of the recurrence may redo or a pause drop.
  isUntouched(): boolean {
    return this.payments.length === 0 && this.settledAt === null && this.skippedAt === null;
  }

  // History: it has a payment or a mark, so it is kept when its recurrence is deleted.
  isHistory(): boolean {
    return !this.isUntouched();
  }

  // What each payment that counts is worth now, oldest first. `worthOf` answers the amount of a
  // transaction today and its day, or `null` when the transaction does not count (ignored, removed
  // by the bank without an edit, gone): that payment settles nothing.
  countedPayments(
    worthOf: (transactionId: string) => { cents: number; occurredOn: BusinessDate } | null,
  ): Occurrence.CountedPayment[] {
    return this.payments
      .flatMap((payment) => {
        const worth = worthOf(payment.transactionId);
        if (worth === null) return [];

        return [
          {
            payment,
            cents: Math.min(payment.amount.cents, worth.cents),
            occurredOn: worth.occurredOn,
          },
        ];
      })
      .toSorted(
        (a, b) =>
          a.occurredOn.value.localeCompare(b.occurredOn.value) ||
          a.payment.createdAt.localeCompare(b.payment.createdAt) ||
          a.payment.id.localeCompare(b.payment.id),
      );
  }

  // A transaction abates the occurrence. The decision about a difference is asked again: the
  // difference is not the same any more.
  link(
    input: { transactionId: string; amount: Money; linkedBy: OccurrenceContract.LinkedBy },
    now: string,
  ): OccurrencePayment {
    if (this.skippedAt !== null) throw new OccurrenceSkippedError();

    const payment = new OccurrencePayment({ ...input, createdAt: now });
    this.payments = [...this.payments, payment];
    this.differenceDecision = null;
    this.updatedAt = now;

    return payment;
  }

  unlink(paymentId: string, now: string): OccurrencePayment {
    const payment = this.payments.find((candidate) => candidate.id === paymentId);
    if (!payment) throw new OccurrencePaymentNotFoundError();

    this.payments = this.payments.filter((candidate) => candidate.id !== paymentId);
    this.differenceDecision = null;
    this.updatedAt = now;

    return payment;
  }

  // "Marcar como paga ou recebida" (BR-REC-007). `isConfirmed` says the payments already confirm it.
  settle(isConfirmed: boolean, now: string): void {
    if (this.skippedAt !== null) throw new OccurrenceSkippedError();
    if (this.settledAt !== null || isConfirmed) throw new OccurrenceAlreadySettledError();

    this.settledAt = now;
    this.updatedAt = now;
  }

  unsettle(now: string): void {
    if (this.settledAt === null) throw new OccurrenceNotSettledError();

    this.settledAt = null;
    this.updatedAt = now;
  }

  // "Dispensar" (Q7): it will not happen this month. Payments already linked stay. A confirmed one
  // cannot be skipped: undo the confirmation first.
  skip(isConfirmed: boolean, now: string): void {
    if (this.skippedAt !== null) throw new OccurrenceAlreadySkippedError();
    if (isConfirmed) throw new OccurrenceAlreadySettledError();

    this.skippedAt = now;
    this.updatedAt = now;
  }

  unskip(now: string): void {
    if (this.skippedAt === null) throw new OccurrenceNotSkippedError();

    this.skippedAt = null;
    this.updatedAt = now;
  }

  // "Editar valor esperado" (only this month). The difference is worked out again.
  changeExpectedAmount(amount: Money, now: string): void {
    if (amount.cents <= 0) throw new RangeError('The expected amount is positive');

    this.expectedAmount = amount;
    this.differenceDecision = null;
    this.updatedAt = now;
  }

  // Lucas answers a difference: "Atualizar" or "Manter" (BR-REC-009). Answering again keeps the
  // last answer. Without a difference there is nothing to answer.
  decideDifference(
    decision: OccurrenceContract.Decision,
    hasDifference: boolean,
    now: string,
  ): void {
    if (!hasDifference) throw new OccurrenceNoDifferenceError();

    this.differenceDecision = decision;
    this.updatedAt = now;
  }

  // The recurrence changed its rule or its amount and this month has not been touched: the window
  // (and the day) follow the new rule.
  reschedule(window: OccurrenceWindow, now: string): void {
    this.expectedOn = window.expectedOn;
    this.windowStartOn = window.windowStartOn;
    this.windowEndOn = window.windowEndOn;
    this.updatedAt = now;
  }

  // The recurrence changed its amount and this month has not been touched. Not a manual edit, so
  // it does not clear a decision (an untouched month has none).
  retarget(amount: Money, now: string): void {
    this.expectedAmount = amount;
    this.updatedAt = now;
  }
}

export namespace Occurrence {
  export type Attributes = {
    id?: string;
    recurrenceId: string;
    month: Month;
    expectedOn: BusinessDate | null;
    windowStartOn: BusinessDate;
    windowEndOn: BusinessDate;
    expectedAmount: Money;
    settledAt: string | null;
    skippedAt: string | null;
    differenceDecision: OccurrenceContract.Decision | null;
    payments: OccurrencePayment[];
    createdAt: string;
    updatedAt?: string;
  };

  export type CountedPayment = {
    payment: OccurrencePayment;
    // What it is worth now: the least of what it was and what the transaction is today.
    cents: number;
    // The day of the transaction.
    occurredOn: BusinessDate;
  };
}
