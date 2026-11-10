import type { IconName } from '@fincheck/ui';
import { useState } from 'react';

import { computeFriendBalances } from '#/domain/bills/bill/rules/compute-friend-balances.rule.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { DebtDeleteDialog } from '#/features/bills/debt-delete/debt-delete.viewmodel.tsx';
import { DebtFormModal } from '#/features/bills/debt-form/debt-form.viewmodel.tsx';
import { useFriendListModel } from '#/features/bills/friend-list/friend-list.model.ts';
import { FriendListView } from '#/features/bills/friend-list/friend-list.view.tsx';
import { useOpenFriends } from '#/features/bills/friend-list/hooks/use-open-friends.hook.ts';
import { friendListSearchSchema } from '#/features/bills/friend-list/schemas/friend-list-search.schema.ts';
import { billToPaymentItem } from '#/features/bills/friend-list/utils/bill-to-payment-item.util.ts';
import { presentFriend } from '#/features/bills/friend-list/utils/present-friend.util.ts';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import { useDebtActions } from '#/features/bills/hooks/use-debt-actions.hook.ts';
import { PaymentRegisterDialog } from '#/features/bills/payment-register/payment-register.viewmodel.tsx';
import { useFoundPayment } from '#/features/bills/hooks/use-found-payment.hook.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { useScreenSearch } from '#/shared/hooks/use-screen-search.hook.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';

/**
 * Recorrentes › Amigos: the friend debts by person. It reads them all (settled included), nets
 * each person's balance, opens the person of `?person=` and mounts the debt modals: new (`?new=debt`,
 * with `?friend=` for a person already chosen), edit (`?debt=`), the payment (`?pay=bill:<id>`) and
 * the delete confirmation. The agenda is a complement: a Pix it found for a debt and not yet
 * linked shows as a line inside the person, with the "Vincular" of A pagar e receber.
 */
export function FriendList() {
  const model = useFriendListModel();
  const { search } = useScreenSearch(friendListSearchSchema);
  const billSearch = useBillSearch();
  const [actionError, setActionError] = useState<string | null>(null);
  const debts = useDebtActions({ onError: setActionError });
  const foundPayment = useFoundPayment();

  const bills = model.bills.data?.items ?? [];
  const balances = computeFriendBalances(bills);
  const open = useOpenFriends(
    search.person,
    balances.map((friend) => friend.key),
  );

  const categoryIcons = new Map<string, IconName>(
    (model.categories.data?.items ?? []).map((category) => [
      category.id,
      mapCategoryIcon(category.icon),
    ]),
  );
  const today = getBusinessDate();
  const people = balances.map((friend) =>
    presentFriend(
      friend,
      today,
      categoryIcons,
      model.foundPayments.get(friend.key) ?? [],
      model.transactions,
    ),
  );
  const payBill = billSearch.payKey
    ? bills.find((bill) => `bill:${bill.id}` === billSearch.payKey)
    : undefined;

  const status = model.bills.isError
    ? 'error'
    : model.bills.isPending || model.categories.isPending
      ? 'loading'
      : people.length === 0
        ? 'empty'
        : 'ready';

  async function linkFoundPix(billId: string) {
    const found = [...model.foundPayments.values()].flat().find((entry) => entry.billId === billId);
    if (!found) return;
    setActionError(null);

    try {
      // The same link A pagar e receber gives that debt: it confirms the Pix the API found.
      await foundPayment.link(found.item);
    } catch (error) {
      setActionError(describeApiError(error));
    }
  }

  return (
    <>
      <FriendListView
        status={status}
        onRetry={() => void model.bills.refetch()}
        actionError={actionError}
        onDismissActionError={() => setActionError(null)}
        people={people}
        isOpen={open.isOpen}
        onToggle={open.toggle}
        scrollKey={open.scrollKey}
        onNewDebt={() => billSearch.openNewModal('debt')}
        onNewDebtFor={billSearch.openNewDebtFor}
        onDebtEdit={(billId) => {
          setActionError(null);
          void debts.edit(billId);
        }}
        onDebtDelete={(target) => void debts.askDelete(target)}
        onDebtRegister={(billId) => billSearch.openPayment(`bill:${billId}`)}
        onFoundPixLink={(billId) => void linkFoundPix(billId)}
        isLinkingPix={foundPayment.isPending}
      />
      <DebtFormModal />
      <PaymentRegisterDialog
        item={payBill ? billToPaymentItem(payBill) : null}
        onClose={billSearch.closePayment}
      />
      <DebtDeleteDialog
        target={debts.deleteTarget}
        onClose={debts.closeDelete}
        onError={setActionError}
      />
    </>
  );
}
