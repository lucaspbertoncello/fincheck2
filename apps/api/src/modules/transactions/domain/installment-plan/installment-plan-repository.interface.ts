import type { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';

// The port to the store of installment plans. `Executor` is the database handle: pass the one of a
// unit of work to read and write inside it.
export interface InstallmentPlanRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<InstallmentPlan | null>;
  findByIds(ids: string[], executor?: Executor): Promise<InstallmentPlan[]>;
  list(options: { accountId?: string }, executor?: Executor): Promise<InstallmentPlan[]>;
  // Creates the plan. The parcels are saved by the transactions' repository, after it.
  insert(plan: InstallmentPlan, executor?: Executor): Promise<void>;
  // Deletes the plan; its parcels (and what hangs on them) go by `ON DELETE CASCADE`.
  delete(id: string, executor?: Executor): Promise<void>;
}
