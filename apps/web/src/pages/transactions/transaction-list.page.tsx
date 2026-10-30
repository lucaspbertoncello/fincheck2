import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';
import { TransactionCreationModals } from '#/features/transactions/transaction-creation/transaction-creation-modals.component.tsx';
import { TransactionListViewModel } from '#/features/transactions/transaction-list/transaction-list.viewmodel.tsx';

/** Transações: the list (or the by-category view) and the creation modals the screen owns. */
export function TransactionListPage() {
  return (
    <ScreenFrame screen={SCREENS.transactions}>
      <TransactionListViewModel />
      <TransactionCreationModals />
    </ScreenFrame>
  );
}
