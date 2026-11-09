import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { BillPayment as BillPaymentContract } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillPaymentLinker } from '#/modules/bills/application/bill-payment/bill-payment-linker.service.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Registrar pagamento" and "Registrar recebimento" (RF-BIL-002), total or partial, by hand or tied
// to a transaction. With a transaction the amount defaults to its value and the day to its day; the
// effect on the transaction is the one of `BillPaymentLinker`.
export class CreateBillPaymentUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly linker: BillPaymentLinker;
  private readonly builder: BillDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    linker: BillPaymentLinker,
    builder: BillDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.bills = bills;
    this.linker = linker;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateBillPaymentUseCase.Input): Promise<CreateBillPaymentUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const bill = await requireBill(this.bills, input.id, executor);

      await this.linker.link(
        bill,
        {
          transactionId: input.transactionId,
          ...(input.amountCents === undefined ? {} : { amountCents: input.amountCents }),
          ...(input.paidOn === undefined ? {} : { paidOn: input.paidOn }),
        },
        this.clock.now(),
        executor,
      );
      await this.bills.save(bill, executor);

      return this.builder.buildOne(bill, executor);
    });
  }
}

export namespace CreateBillPaymentUseCase {
  export type Input = BillContract.Params & BillPaymentContract.CreateRequest;
  export type Output = BillContract.Dto;
}
