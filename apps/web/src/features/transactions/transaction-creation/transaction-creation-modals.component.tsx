import { InstallmentCreateViewModel } from '#/features/transactions/transaction-creation/installment-create/installment-create.viewmodel.tsx';
import { TransactionCreateViewModel } from '#/features/transactions/transaction-creation/transaction-create/transaction-create.viewmodel.tsx';
import { useTransactionListSearch } from '#/shared/hooks/transactions/use-transaction-list-search.hook.ts';

/**
 * The two creation modals the Transações feature owns, opened by the `new` search param:
 * `?new=transaction` is "Nova transação" and `?new=installment` is "Compra parcelada". Mount it once
 * in a page; any screen opens a modal by navigating to its own path with that param (the "+" menu).
 * Closing removes the param and keeps the rest of the URL.
 */
export function TransactionCreationModals() {
  const { search, update } = useTransactionListSearch();
  const close = () => update({ new: null });

  if (search.new === 'transaction') return <TransactionCreateViewModel onClose={close} />;
  if (search.new === 'installment') return <InstallmentCreateViewModel onClose={close} />;
  return null;
}
