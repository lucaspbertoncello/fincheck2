import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';
import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The undo of "Não é este": the transaction is a candidate of the bill again. Nothing happens if it
// was not dismissed. Answers the bill.
export class UndoBillPaymentSuggestionDismissalUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly transactions: BillTransactionReader;
  private readonly builder: BillDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    transactions: BillTransactionReader,
    builder: BillDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.bills = bills;
    this.transactions = transactions;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: UndoBillPaymentSuggestionDismissalUseCase.Input,
  ): Promise<UndoBillPaymentSuggestionDismissalUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const bill = await requireBill(this.bills, input.id, executor);
      await this.transactions.requireOne(input.transactionId, executor);

      bill.undoDismissal(input.transactionId, this.clock.now());
      await this.bills.save(bill, executor);

      return this.builder.buildOne(bill, executor);
    });
  }
}

export namespace UndoBillPaymentSuggestionDismissalUseCase {
  export type Input = BillContract.Params & PaymentSuggestion.DismissQuery;
  export type Output = BillContract.Dto;
}
