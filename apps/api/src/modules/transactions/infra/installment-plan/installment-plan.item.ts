import type { Insertable, Selectable } from 'kysely';

import type { InstallmentPlansTable } from '#/database/tables/transactions/installment-plans-table.type.ts';
import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The plan as a row of `installment_plans`; the parcels are rows of `transactions`.
export class InstallmentPlanItem {
  static fromEntity(plan: InstallmentPlan): Insertable<InstallmentPlansTable> {
    return {
      id: plan.id,
      account_id: plan.accountId,
      origin: plan.origin,
      description: plan.description,
      purchase_on: plan.purchaseOn.value,
      total_cents: plan.total.cents,
      installment_count: plan.installmentCount,
      first_invoice_month: plan.firstInvoiceMonth.value,
      category_id: plan.categoryId,
      created_at: plan.createdAt,
      updated_at: plan.updatedAt,
    };
  }

  static toDomain(row: Selectable<InstallmentPlansTable>): InstallmentPlan {
    return new InstallmentPlan({
      id: row.id,
      accountId: row.account_id,
      origin: row.origin,
      description: row.description,
      purchaseOn: BusinessDate.of(row.purchase_on),
      total: Money.fromCents(row.total_cents),
      installmentCount: row.installment_count,
      firstInvoiceMonth: Month.of(row.first_invoice_month),
      categoryId: row.category_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
