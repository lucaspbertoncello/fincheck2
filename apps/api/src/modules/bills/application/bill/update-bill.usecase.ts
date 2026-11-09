import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillCategoryReader } from '#/modules/bills/application/bill-payment/bill-category-reader.interface.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Editar" a bill (RF-BIL-001). It touches no transaction, nor the category already put on a payment
// made: a new category only counts for the next ones (decision B6). The value cannot go below what
// was paid.
export class UpdateBillUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly categories: BillCategoryReader;
  private readonly builder: BillDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    categories: BillCategoryReader,
    builder: BillDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.bills = bills;
    this.categories = categories;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateBillUseCase.Input): Promise<UpdateBillUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const bill = await requireBill(this.bills, input.id, executor);

      const patch: Bill.EditInput = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.counterparty !== undefined) patch.counterparty = input.counterparty;
      if (input.amountCents !== undefined) patch.amount = Money.fromCents(input.amountCents);
      if (input.dueOn !== undefined) {
        patch.dueOn = input.dueOn === null ? null : BusinessDate.of(input.dueOn);
      }
      if (input.categoryId !== undefined) {
        patch.category =
          input.categoryId === null
            ? null
            : ((await this.categories.requireCategories([input.categoryId], executor)).get(
                input.categoryId,
              ) ?? null);
      }

      bill.edit(patch, await this.builder.measurePaid(bill, executor), this.clock.now());
      await this.bills.save(bill, executor);

      return this.builder.buildOne(bill, executor);
    });
  }
}

export namespace UpdateBillUseCase {
  export type Input = BillContract.Params & BillContract.UpdateRequest;
  export type Output = BillContract.Dto;
}
