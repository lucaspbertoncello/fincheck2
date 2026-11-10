import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { InstallmentPlanRepository } from '#/modules/transactions/domain/installment-plan/installment-plan-repository.interface.ts';
import { InstallmentPlanItem } from '#/modules/transactions/infra/installment-plan/installment-plan.item.ts';

// The installment plans' store on SQLite. Every method accepts the executor of a unit of work.
export class KyselyInstallmentPlanRepository implements InstallmentPlanRepository<
  Kysely<Database>
> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(
    id: string,
    executor: Kysely<Database> = this.db,
  ): Promise<InstallmentPlan | null> {
    const row = await executor
      .selectFrom('installment_plans')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? InstallmentPlanItem.toDomain(row) : null;
  }

  async findByIds(ids: string[], executor: Kysely<Database> = this.db): Promise<InstallmentPlan[]> {
    if (ids.length === 0) return [];
    const rows = await executor
      .selectFrom('installment_plans')
      .selectAll()
      .where('id', 'in', ids)
      .execute();

    return rows.map((row) => InstallmentPlanItem.toDomain(row));
  }

  async list(
    options: { accountId?: string },
    executor: Kysely<Database> = this.db,
  ): Promise<InstallmentPlan[]> {
    let query = executor.selectFrom('installment_plans').selectAll();
    if (options.accountId) query = query.where('account_id', '=', options.accountId);
    const rows = await query.orderBy('purchase_on', 'desc').orderBy('id', 'desc').execute();

    return rows.map((row) => InstallmentPlanItem.toDomain(row));
  }

  async insert(plan: InstallmentPlan, executor: Kysely<Database> = this.db): Promise<void> {
    await executor
      .insertInto('installment_plans')
      .values(InstallmentPlanItem.fromEntity(plan))
      .execute();
  }

  async update(plan: InstallmentPlan, executor: Kysely<Database> = this.db): Promise<void> {
    // `account_id`, `origin`, `purchase_on` and `created_at` never change.
    await executor
      .updateTable('installment_plans')
      .set({
        description: plan.description,
        total_cents: plan.total.cents,
        installment_count: plan.installmentCount,
        first_invoice_month: plan.firstInvoiceMonth.value,
        category_id: plan.categoryId,
        updated_at: plan.updatedAt,
      })
      .where('id', '=', plan.id)
      .execute();
  }

  async delete(id: string, executor: Kysely<Database> = this.db): Promise<void> {
    await executor.deleteFrom('installment_plans').where('id', '=', id).execute();
  }
}
