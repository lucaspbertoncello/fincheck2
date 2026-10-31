import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';

import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';

// The contract's InstallmentPlan.Dto: every installment, the next one and what is still to pay
// (from the open invoice of the card on).
export function presentInstallmentPlan(
  database: MockState.Database,
  plan: MockState.InstallmentPlanRecord,
): InstallmentPlan.Dto {
  const card = database.accounts.find((account) => account.id === plan.accountId)?.creditCard;
  const openMonth = card ? openMonthFor(card, TODAY) : plan.firstInvoiceMonth;

  const installments: InstallmentPlan.ItemDto[] = database.transactions
    .filter((tx) => tx.installment?.planId === plan.id && tx.invoiceMonth !== null)
    .map((tx) => ({
      transactionId: tx.id,
      number: tx.installment?.number ?? 1,
      amountCents: Math.abs(tx.amountCents),
      invoiceMonth: tx.invoiceMonth ?? plan.firstInvoiceMonth,
      occurredOn: tx.occurredOn,
    }))
    .sort((a, b) => a.number - b.number);

  const upcoming = installments.filter((item) => item.invoiceMonth >= openMonth);
  const next = upcoming[0];

  return {
    id: plan.id,
    accountId: plan.accountId,
    origin: plan.origin,
    description: plan.description,
    purchaseOn: plan.purchaseOn,
    totalCents: plan.totalCents,
    installmentCount: plan.installmentCount,
    firstInvoiceMonth: plan.firstInvoiceMonth,
    categoryId: plan.categoryId,
    installments,
    nextInstallment: next
      ? { number: next.number, invoiceMonth: next.invoiceMonth, amountCents: next.amountCents }
      : null,
    remainingCents: upcoming.reduce((sum, item) => sum + item.amountCents, 0),
  };
}
