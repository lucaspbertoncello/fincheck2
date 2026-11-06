import type { InstallmentPlan as InstallmentPlanContract } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OpenInvoiceMonthReader } from '#/modules/transactions/application/installment-plan/open-invoice-month-reader.interface.ts';
import type { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';

// Builds the `InstallmentPlan.Dto`: every parcel in order, the next one and what is still to pay.
// "Next" and "still to pay" start from the open invoice of the card (the first parcel whose invoice
// is that month or later), asked to `invoices`.
export class InstallmentPlanDtoBuilder {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly openMonths: OpenInvoiceMonthReader;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    openMonths: OpenInvoiceMonthReader,
  ) {
    this.transactions = transactions;
    this.openMonths = openMonths;
  }

  async build(
    plans: InstallmentPlan[],
    executor?: Kysely<Database>,
  ): Promise<InstallmentPlanContract.Dto[]> {
    if (plans.length === 0) return [];

    const [parcels, openMonths] = await Promise.all([
      this.transactions.findByInstallmentPlanIds(
        plans.map((plan) => plan.id),
        executor,
      ),
      this.openMonths.openMonthsOf([...new Set(plans.map((plan) => plan.accountId))], executor),
    ]);

    return plans.map((plan) => {
      const installments: InstallmentPlanContract.ItemDto[] = parcels
        .filter((parcel) => parcel.installment?.planId === plan.id && parcel.invoiceMonth !== null)
        .map((parcel) => ({
          transactionId: parcel.id,
          number: parcel.installment?.number ?? 0,
          amountCents: Math.abs(parcel.amount.cents),
          invoiceMonth: parcel.invoiceMonth?.value ?? plan.firstInvoiceMonth.value,
          occurredOn: parcel.occurredOn.value,
        }))
        .sort((a, b) => a.number - b.number);

      const openMonth = (openMonths.get(plan.accountId) ?? plan.firstInvoiceMonth).value;
      const upcoming = installments.filter((item) => item.invoiceMonth >= openMonth);
      const next = upcoming[0];

      return {
        id: plan.id,
        accountId: plan.accountId,
        origin: plan.origin,
        description: plan.description,
        purchaseOn: plan.purchaseOn.value,
        totalCents: plan.total.cents,
        installmentCount: plan.installmentCount,
        firstInvoiceMonth: plan.firstInvoiceMonth.value,
        categoryId: plan.categoryId,
        installments,
        nextInstallment: next
          ? { number: next.number, invoiceMonth: next.invoiceMonth, amountCents: next.amountCents }
          : null,
        remainingCents: upcoming.reduce((sum, item) => sum + item.amountCents, 0),
      };
    });
  }
}
