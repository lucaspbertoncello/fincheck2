import { AccountListViewModel } from '#/features/accounts/account-list/account-list.viewmodel.tsx';
import { AdjustBalanceViewModel } from '#/features/accounts/adjust-balance/adjust-balance.viewmodel.tsx';
import { ConnectAccountViewModel } from '#/features/accounts/connect-account/connect-account.viewmodel.tsx';
import { DeleteAccountViewModel } from '#/features/accounts/delete-account/delete-account.viewmodel.tsx';
import { CorrectInvoiceViewModel } from '#/features/invoices/correct-invoice/correct-invoice.viewmodel.tsx';
import { InvoiceDetailViewModel } from '#/features/invoices/invoice-detail/invoice-detail.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Contas e cartões: the list and the modals that open from its URL state. */
export function AccountListPage() {
  return (
    <ScreenFrame screen={SCREENS.accounts}>
      <AccountListViewModel />
      <ConnectAccountViewModel />
      <AdjustBalanceViewModel />
      <DeleteAccountViewModel />
      <InvoiceDetailViewModel />
      <CorrectInvoiceViewModel />
    </ScreenFrame>
  );
}
