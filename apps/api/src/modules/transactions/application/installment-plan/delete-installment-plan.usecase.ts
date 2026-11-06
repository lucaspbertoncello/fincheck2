import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { InstallmentPlanNotFoundError } from '#/modules/transactions/domain/installment-plan/installment-plan-not-found.error.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Deletes a purchase in installments entered by hand (RF-INV-004). The parcels, with their parts,
// tags and links of payment, go with the plan by `ON DELETE CASCADE`.
export class DeleteInstallmentPlanUseCase {
  private readonly plans: InstallmentPlanRepository<Kysely<Database>>;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(
    plans: InstallmentPlanRepository<Kysely<Database>>,
    unitOfWork: UnitOfWork<Kysely<Database>>,
  ) {
    this.plans = plans;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: DeleteInstallmentPlanUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const plan = await this.plans.findById(input.id, executor);
      if (!plan) throw new InstallmentPlanNotFoundError();
      plan.assertDeletable();

      await this.plans.delete(plan.id, executor);
    });
  }
}

export namespace DeleteInstallmentPlanUseCase {
  export type Input = { id: string };
}
