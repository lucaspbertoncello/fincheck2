import type { InstallmentPlan as InstallmentPlanContract } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InstallmentPlanDtoBuilder } from '#/modules/transactions/application/installment-plan/installment-plan-dto-builder.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Compra parcelada" (RF-INV-004): creates the plan and one transaction per parcel, in one unit of
// work. The value of each parcel comes from `Money.allocate` (the first takes the leftover cents);
// each one counts in the month of its invoice (Q1).
export class CreateInstallmentPlanUseCase {
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly references: TransactionReferenceResolver;
  private readonly builder: InstallmentPlanDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    plans: InstallmentPlanRepository<Kysely<Database>>,
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    references: TransactionReferenceResolver,
    builder: InstallmentPlanDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.plans = plans;
    this.transactions = transactions;
    this.accounts = accounts;
    this.references = references;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: CreateInstallmentPlanUseCase.Input,
  ): Promise<CreateInstallmentPlanUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const account = await this.accounts.requireAccount(input.accountId, executor);
      const category = await this.references.category(input.categoryId, executor);
      const tags = await this.references.tagsById(input.tagIds ?? [], executor);

      // The first and the last parcel must fall inside the years the API accepts.
      const firstInvoiceMonth = Month.of(input.firstInvoiceMonth);
      assertSupportedMonth(firstInvoiceMonth, 'firstInvoiceMonth');
      let lastInvoiceMonth = firstInvoiceMonth;
      for (let parcel = 1; parcel < input.installmentCount; parcel++) {
        lastInvoiceMonth = lastInvoiceMonth.next();
      }
      assertSupportedMonth(lastInvoiceMonth, 'installmentCount');

      const plan = InstallmentPlan.createManual(
        {
          account,
          description: input.description,
          total: Money.fromCents(input.totalCents),
          installmentCount: input.installmentCount,
          firstInvoiceMonth,
          purchaseOn: BusinessDate.of(input.purchaseOn),
          category,
          tags,
        },
        now,
      );
      await this.plans.insert(plan, executor);
      for (const parcel of plan.buildParcels({ category, tags }, now)) {
        await this.transactions.save(parcel, executor);
      }

      const [dto] = await this.builder.build([plan], executor);
      if (!dto) throw new Error('The builder returned no plan');

      return dto;
    });
  }
}

export namespace CreateInstallmentPlanUseCase {
  export type Input = InstallmentPlanContract.CreateRequest;
  export type Output = InstallmentPlanContract.Dto;
}
