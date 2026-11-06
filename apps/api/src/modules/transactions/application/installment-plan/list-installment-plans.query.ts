import type { InstallmentPlan as InstallmentPlanContract } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

import type { InstallmentPlanDtoBuilder } from '#/modules/transactions/application/installment-plan/installment-plan-dto-builder.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// "Próximas parcelas" of each card (`GET /installment-plans`). `active` keeps the plans that still
// have a parcel from the open invoice on (`true`) or the ones that are over (`false`). The order is
// by the invoice of the next parcel; the plans with no next parcel go last, newest purchase first.
export class ListInstallmentPlansQuery {
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly builder: InstallmentPlanDtoBuilder;

  constructor(
    plans: InstallmentPlanRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    builder: InstallmentPlanDtoBuilder,
  ) {
    this.plans = plans;
    this.accounts = accounts;
    this.builder = builder;
  }

  async execute(input: ListInstallmentPlansQuery.Input): Promise<ListInstallmentPlansQuery.Output> {
    if (input.accountId) await this.accounts.requireAccount(input.accountId);

    const plans = await this.plans.list(input.accountId ? { accountId: input.accountId } : {});
    const items = (await this.builder.build(plans))
      .filter(
        (plan) => input.active === undefined || (plan.nextInstallment !== null) === input.active,
      )
      .sort((a, b) => {
        if (a.nextInstallment === null && b.nextInstallment === null) {
          return b.purchaseOn.localeCompare(a.purchaseOn);
        }
        if (a.nextInstallment === null) return 1;
        if (b.nextInstallment === null) return -1;

        return a.nextInstallment.invoiceMonth.localeCompare(b.nextInstallment.invoiceMonth);
      });

    return { items };
  }
}

export namespace ListInstallmentPlansQuery {
  export type Input = InstallmentPlanContract.ListQuery;
  export type Output = { items: InstallmentPlanContract.Dto[] };
}
