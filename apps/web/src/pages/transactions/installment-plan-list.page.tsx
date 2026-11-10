import { InstallmentPlansViewModel } from '#/features/transactions/installment-plans/installment-plans.viewmodel.tsx';

/** "Compras parceladas" of a card (`/cards/:id/installments`), reached from Contas e cartões. */
export function InstallmentPlanListPage() {
  return <InstallmentPlansViewModel />;
}
