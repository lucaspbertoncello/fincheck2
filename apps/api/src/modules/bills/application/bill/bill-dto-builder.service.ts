import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { BillPayment as BillPaymentContract } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { computeBillState } from '#/modules/bills/domain/bill/compute-bill-state.util.ts';
import { computePaymentCents } from '#/modules/bills/domain/bill-payment/compute-payment-cents.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// Builds the `Bill.Dto`: asks `transactions` (port) what each transaction that pays the bill, or
// that it originates from, is worth now, so the paid amount follows the transaction (ignoring or
// correcting it changes the bill at once). A payment tied to a transaction that no longer counts
// keeps its link and is left out of `payments`.
export class BillDtoBuilder {
  private readonly transactions: BillTransactionReader;
  private readonly clock: Clock;

  constructor(transactions: BillTransactionReader, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  // What the bill has paid (or received) now.
  async measurePaid(bill: Bill, executor?: Kysely<Database>): Promise<Money> {
    const snapshots = await this.transactions.findMany(
      bill.payments.flatMap((payment) => (payment.transactionId ? [payment.transactionId] : [])),
      executor,
    );

    return Money.fromCents(
      BillDtoBuilder.countPayments(bill, snapshots).reduce((sum, line) => sum + line.cents, 0),
    );
  }

  async buildOne(bill: Bill, executor?: Kysely<Database>): Promise<BillContract.Dto> {
    const [dto] = await this.buildMany([bill], executor);
    if (!dto) throw new RangeError('The bill was not built');

    return dto;
  }

  async buildMany(bills: Bill[], executor?: Kysely<Database>): Promise<BillContract.Dto[]> {
    if (bills.length === 0) return [];
    const transactionIds = bills.flatMap((bill) => [
      ...bill.payments.flatMap((payment) => (payment.transactionId ? [payment.transactionId] : [])),
      ...(bill.originTransactionId ? [bill.originTransactionId] : []),
    ]);
    const snapshots = await this.transactions.findMany(transactionIds, executor);
    const today = this.clock.today().value;

    return bills.map((bill) => {
      const lines = BillDtoBuilder.countPayments(bill, snapshots);
      const paidCents = lines.reduce((sum, line) => sum + line.cents, 0);
      const origin = bill.originTransactionId ? snapshots.get(bill.originTransactionId) : undefined;

      return {
        id: bill.id,
        direction: bill.direction,
        kind: bill.kind,
        description: bill.description,
        counterparty: bill.counterparty,
        amountCents: bill.amount.cents,
        paidCents,
        remainingCents: Math.max(0, bill.amount.cents - paidCents),
        dueOn: bill.dueOn?.value ?? null,
        categoryId: bill.categoryId,
        status: computeBillState({
          amountCents: bill.amount.cents,
          paidCents,
          dueOn: bill.dueOn?.value ?? null,
          today,
        }),
        origin:
          origin && origin.lentCents > 0
            ? {
                transactionId: origin.id,
                amountCents: origin.lentCents,
                occurredOn: origin.occurredOn,
                description: origin.description,
              }
            : null,
        payments: lines
          .filter((line) => line.cents > 0)
          .map((line): BillPaymentContract.Dto => line.dto),
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };
    });
  }

  // Each payment with what it is worth, in the order `paidOn`, then creation, then id. The lines are
  // cut one by one to what the bill still misses (`amount - what the earlier ones came to`), so the
  // paid amount never passes the value of the bill even when a transaction that did not count (ignored,
  // removed by the bank) counts again after another payment was made, or the value was lowered.
  private static countPayments(
    bill: Bill,
    snapshots: Map<string, BillTransactionReader.Snapshot>,
  ): { cents: number; dto: BillPaymentContract.Dto }[] {
    let accumulated = 0;

    return [...bill.payments]
      .sort(
        (a, b) =>
          a.paidOn.value.localeCompare(b.paidOn.value) ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      )
      .map((payment) => {
        const snapshot =
          payment.transactionId === null
            ? 'manual'
            : (snapshots.get(payment.transactionId) ?? null);
        const cents = Math.min(
          computePaymentCents({ recordedCents: payment.amount.cents, transaction: snapshot }),
          Math.max(0, bill.amount.cents - accumulated),
        );
        accumulated += cents;

        return {
          cents,
          dto: {
            id: payment.id,
            amountCents: cents,
            paidOn: payment.paidOn.value,
            transactionId: payment.transactionId,
            description: snapshot === 'manual' || snapshot === null ? null : snapshot.description,
          },
        };
      });
  }
}
