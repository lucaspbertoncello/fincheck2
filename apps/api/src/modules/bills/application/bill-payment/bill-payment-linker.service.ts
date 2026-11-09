import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillCategoryReader } from '#/modules/bills/application/bill-payment/bill-category-reader.interface.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { BillTransactionWriter } from '#/modules/bills/application/bill-payment/bill-transaction-writer.interface.ts';
import type { LinkedElsewhereReader } from '#/modules/bills/application/bill-payment/linked-elsewhere-reader.interface.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import { assertTransactionCanPayBill } from '#/modules/bills/domain/bill-payment/assert-transaction-can-pay-bill.util.ts';
import type { BillPayment } from '#/modules/bills/domain/bill-payment/bill-payment.entity.ts';
import { BillPaymentTransactionInvalidError } from '#/modules/bills/domain/bill-payment/bill-payment-transaction-invalid.error.ts';
import { BillTransactionAlreadyLinkedError } from '#/modules/bills/domain/bill-payment/bill-transaction-already-linked.error.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The one place that records a payment on a bill and its effect on the transaction (BR-BIL-005,
// 006): the Pix that comes back from a friend becomes `reimbursed`, one that pays a friend or a
// general bill takes the category of the bill when it has none. The order of the errors: the
// transaction that does not exist (404), the one already tied elsewhere (409), the one of the wrong
// kind, the bill settled, the value over what is missing (422).
export class BillPaymentLinker {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly transactions: BillTransactionReader;
  private readonly writer: BillTransactionWriter;
  private readonly categories: BillCategoryReader;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;
  private readonly builder: BillDtoBuilder;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    transactions: BillTransactionReader,
    writer: BillTransactionWriter,
    categories: BillCategoryReader,
    linkedElsewhere: LinkedElsewhereReader | undefined,
    builder: BillDtoBuilder,
  ) {
    this.bills = bills;
    this.transactions = transactions;
    this.writer = writer;
    this.categories = categories;
    this.linkedElsewhere = linkedElsewhere;
    this.builder = builder;
  }

  // Whether the transaction already pays or originates any bill, or settles an invoice or an
  // occurrence.
  async isLinked(transactionId: string, executor: Kysely<Database>): Promise<boolean> {
    const [inBills, elsewhere] = await Promise.all([
      this.bills.findLinkedTransactionIds([transactionId], executor),
      this.linkedElsewhere?.findLinkedTransactionIds([transactionId], executor),
    ]);

    return inBills.has(transactionId) || Boolean(elsewhere?.has(transactionId));
  }

  async link(
    bill: Bill,
    input: { transactionId?: string | undefined; amountCents?: number; paidOn?: string },
    now: string,
    executor: Kysely<Database>,
  ): Promise<BillPayment> {
    const paid = await this.builder.measurePaid(bill, executor);

    if (input.transactionId === undefined) {
      if (input.amountCents === undefined || input.paidOn === undefined) {
        throw new RangeError('A payment by hand needs the amount and the day');
      }

      return bill.addPayment(
        {
          transactionId: null,
          amount: Money.fromCents(input.amountCents),
          paidOn: BusinessDate.of(input.paidOn),
        },
        paid,
        now,
      );
    }

    const transaction = await this.transactions.requireOne(input.transactionId, executor);
    if (await this.isLinked(transaction.id, executor)) {
      throw new BillTransactionAlreadyLinkedError();
    }
    assertTransactionCanPayBill({
      direction: bill.direction,
      amountCents: transaction.amountCents,
      nature: transaction.nature,
      counts: transaction.counts,
      isSplit: transaction.isSplit,
    });
    const worth = Math.abs(transaction.amountCents);
    // Money that comes back from a friend and is bigger than the debt splits (BR-BIL-005): without an
    // amount, what the payment is worth is what is still missing. Any other bill keeps the whole
    // transaction, which is then too much (`BILL_OVERPAID`). A settled bill keeps `worth`, so the
    // payment is the one refused as `BILL_ALREADY_SETTLED`.
    const missing = bill.amount.cents - paid.cents;
    const defaultCents = bill.isReimbursement() && missing > 0 ? Math.min(worth, missing) : worth;
    const amountCents = input.amountCents ?? defaultCents;
    if (amountCents > worth) throw new BillPaymentTransactionInvalidError();

    const payment = bill.addPayment(
      {
        transactionId: transaction.id,
        amount: Money.fromCents(amountCents),
        paidOn: BusinessDate.of(input.paidOn ?? transaction.occurredOn),
      },
      paid,
      now,
    );

    if (bill.isReimbursement()) {
      await this.writer.reimburse(transaction.id, amountCents, executor);
    } else if (bill.categoryId !== null) {
      const category = (await this.categories.requireCategories([bill.categoryId], executor)).get(
        bill.categoryId,
      );
      if (category) await this.writer.applyCategory(transaction.id, category, executor);
    }

    return payment;
  }

  // Gives the transaction of the payment its place back.
  async unlink(bill: Bill, payment: BillPayment, executor: Kysely<Database>): Promise<void> {
    if (payment.transactionId === null) return;

    if (bill.isReimbursement()) {
      await this.writer.releaseReimbursed(payment.transactionId, executor);
    } else {
      await this.writer.clearCategory(payment.transactionId, executor);
    }
  }
}
