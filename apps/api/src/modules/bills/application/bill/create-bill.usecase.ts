import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillCategoryReader } from '#/modules/bills/application/bill-payment/bill-category-reader.interface.ts';
import type { BillPaymentLinker } from '#/modules/bills/application/bill-payment/bill-payment-linker.service.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { BillTransactionWriter } from '#/modules/bills/application/bill-payment/bill-transaction-writer.interface.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { assertTransactionCanBeOrigin } from '#/modules/bills/domain/bill/assert-transaction-can-be-origin.util.ts';
import { BillOriginAmountExceedsError } from '#/modules/bills/domain/bill/bill-origin-amount-exceeds.error.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import { BillTransactionAlreadyLinkedError } from '#/modules/bills/domain/bill-payment/bill-transaction-already-linked.error.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova conta" and "Dívida com amigo" (RF-BIL-001, 003, 004), with the optional "você pagou" (the
// origin: the friend part of an expense stops being spending) and the optional Pix already made
// (the first payment). All in one unit of work with the transactions. The order of the errors: the
// category and the transactions that do not exist (404), the ones already tied (409), the rest of
// the rules (422).
export class CreateBillUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly categories: BillCategoryReader;
  private readonly transactions: BillTransactionReader;
  private readonly writer: BillTransactionWriter;
  private readonly linker: BillPaymentLinker;
  private readonly builder: BillDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    categories: BillCategoryReader,
    transactions: BillTransactionReader,
    writer: BillTransactionWriter,
    linker: BillPaymentLinker,
    builder: BillDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.bills = bills;
    this.categories = categories;
    this.transactions = transactions;
    this.writer = writer;
    this.linker = linker;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateBillUseCase.Input): Promise<CreateBillUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();

      const category = input.categoryId
        ? ((await this.categories.requireCategories([input.categoryId], executor)).get(
            input.categoryId,
          ) ?? null)
        : null;
      const origin = input.origin
        ? await this.transactions.requireOne(input.origin.transactionId, executor)
        : null;
      if (input.payment) await this.transactions.requireOne(input.payment.transactionId, executor);

      const bill = Bill.create(
        {
          direction: input.direction,
          kind: input.kind,
          description: input.description,
          counterparty: input.counterparty ?? null,
          amount: Money.fromCents(input.amountCents),
          dueOn: input.dueOn ? BusinessDate.of(input.dueOn) : null,
          category,
          originTransactionId: origin?.id ?? null,
        },
        now,
      );

      let friendCents = 0;
      if (origin) {
        if (
          origin.id === input.payment?.transactionId ||
          (await this.linker.isLinked(origin.id, executor))
        ) {
          throw new BillTransactionAlreadyLinkedError();
        }
        assertTransactionCanBeOrigin({
          amountCents: origin.amountCents,
          nature: origin.nature,
          counts: origin.counts,
          isSplit: origin.isSplit,
        });
        const worth = Math.abs(origin.amountCents);
        friendCents = input.origin?.amountCents ?? worth;
        if (friendCents > worth || friendCents > input.amountCents) {
          throw new BillOriginAmountExceedsError();
        }
      }

      if (input.payment) {
        await this.linker.link(bill, { transactionId: input.payment.transactionId }, now, executor);
      }

      await this.bills.save(bill, executor);
      if (origin) await this.writer.lend(origin.id, friendCents, executor);

      return this.builder.buildOne(bill, executor);
    });
  }
}

export namespace CreateBillUseCase {
  export type Input = BillContract.CreateRequest;
  export type Output = BillContract.Dto;
}
