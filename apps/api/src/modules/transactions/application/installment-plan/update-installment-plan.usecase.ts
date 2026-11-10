import type { InstallmentPlan as InstallmentPlanContract } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InstallmentPlanDtoBuilder } from '#/modules/transactions/application/installment-plan/installment-plan-dto-builder.service.ts';
import type { PaidInvoiceMonthReader } from '#/modules/transactions/application/installment-plan/paid-invoice-month-reader.interface.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import { requireWiredReader } from '#/modules/transactions/application/transaction/require-wired-reader.util.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import type { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import { InstallmentPlanNotFoundError } from '#/modules/transactions/domain/installment-plan/installment-plan-not-found.error.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Editar compra parcelada" (RF-INV-004): changes the plan and its parcels in one unit of work, in
// place. The plan (`withChanges`) and the parcels (`reconcileParcels`) carry the rules; this loads
// what they need: the category and the tags, the invoices of the card that already have a payment
// (asked to `invoices`) and the parcels that are tied to a bill or an occurrence. The parcels keep
// their ids; the new ones are created and the last ones deleted, with what hangs on them.
export class UpdateInstallmentPlanUseCase {
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly references: TransactionReferenceResolver;
  private readonly paidInvoices: PaidInvoiceMonthReader | undefined;
  private readonly links: TransactionLinksReader | undefined;
  private readonly builder: InstallmentPlanDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    plans: InstallmentPlanRepository<Kysely<Database>>,
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    references: TransactionReferenceResolver,
    paidInvoices: PaidInvoiceMonthReader | undefined,
    links: TransactionLinksReader | undefined,
    builder: InstallmentPlanDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.plans = plans;
    this.transactions = transactions;
    this.accounts = accounts;
    this.references = references;
    this.paidInvoices = paidInvoices;
    this.links = links;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: UpdateInstallmentPlanUseCase.Input,
  ): Promise<UpdateInstallmentPlanUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const plan = await this.plans.findById(input.id, executor);
      if (!plan) throw new InstallmentPlanNotFoundError();
      plan.assertEditable();
      plan.assertCardActive(await this.accounts.requireAccount(plan.accountId, executor));
      const valuesSent = input.totalCents !== undefined || input.installmentCount !== undefined;

      const parcels = await this.transactions.findByInstallmentPlanIds([plan.id], executor);
      const category = await this.references.category(
        input.categoryId === undefined ? plan.categoryId : input.categoryId,
        executor,
      );
      const tags =
        input.tagIds === undefined
          ? undefined
          : await this.references.tagsById(input.tagIds, executor);
      const knownTags = new Map(
        (
          await this.references.tagsById(
            [...new Set(parcels.flatMap((parcel) => parcel.tagIds))],
            executor,
          )
        ).map((tag) => [tag.id, tag]),
      );

      const next = plan.withChanges(
        {
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.totalCents === undefined ? {} : { total: Money.fromCents(input.totalCents) }),
          ...(input.installmentCount === undefined
            ? {}
            : { installmentCount: input.installmentCount }),
          ...(input.firstInvoiceMonth === undefined
            ? {}
            : { firstInvoiceMonth: Month.of(input.firstInvoiceMonth) }),
          ...(input.categoryId === undefined ? {} : { category }),
          ...(tags === undefined ? {} : { tags }),
        },
        now,
      );

      const { saved, removed } = next.reconcileParcels(
        {
          previous: plan,
          parcels,
          valuesSent,
          category,
          ...(tags === undefined ? {} : { tags }),
          knownTags,
          paidInvoiceMonths: await this.paidInvoiceMonths(plan, next, valuesSent, executor),
          linkedParcelIds: await this.linkedParcelIds(parcels, executor),
        },
        now,
      );

      if (next !== plan) await this.plans.update(next, executor);
      for (const parcel of saved) await this.transactions.save(parcel, executor);
      for (const parcel of removed) await this.transactions.delete(parcel.id, executor);

      const [dto] = await this.builder.build([next], executor);
      if (!dto) throw new Error('The builder returned no plan');

      return dto;
    });
  }

  // The invoices of the card, before and after the edit, that already have a payment. Asked only
  // when the edit can move money (the total or the count sent, or the first invoice); without the owner
  // wired the request is refused, never done without the check.
  private async paidInvoiceMonths(
    before: InstallmentPlan,
    after: InstallmentPlan,
    valuesSent: boolean,
    executor: Kysely<Database>,
  ): Promise<Set<string>> {
    const movesMoney =
      valuesSent ||
      !after.total.equals(before.total) ||
      after.installmentCount !== before.installmentCount ||
      !after.firstInvoiceMonth.equals(before.firstInvoiceMonth);
    if (!movesMoney) return new Set();

    const months: Month[] = [];
    for (const plan of [before, after]) {
      for (let number = 1; number <= plan.installmentCount; number++) {
        months.push(plan.invoiceMonthOf(number));
      }
    }

    return requireWiredReader(
      this.paidInvoices,
      'installmentCount',
      'o contexto de faturas',
    ).paidMonthsOf(after.accountId, months, executor);
  }

  // The parcels that pay a bill or settle an occurrence. Without the readers (unwired in a test)
  // no parcel has a link, which is the truth while they do not exist.
  private async linkedParcelIds(
    parcels: Transaction[],
    executor: Kysely<Database>,
  ): Promise<Set<string>> {
    if (!this.links || parcels.length === 0) return new Set();
    const links = await this.links.linksOf(
      parcels.map((parcel) => parcel.id),
      executor,
    );

    return new Set(
      parcels
        .filter((parcel) => {
          const link = links.get(parcel.id);

          return link !== undefined && (link.occurrence !== null || link.bill !== null);
        })
        .map((parcel) => parcel.id),
    );
  }
}

export namespace UpdateInstallmentPlanUseCase {
  export type Input = { id: string } & InstallmentPlanContract.UpdateRequest;
  export type Output = InstallmentPlanContract.Dto;
}
