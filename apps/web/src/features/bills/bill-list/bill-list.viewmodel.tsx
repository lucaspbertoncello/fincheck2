import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { type IconName, useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useAgenda } from '#/domain/dashboard/agenda/hooks/use-agenda.hook.ts';
import { useSettleOccurrence } from '#/domain/recurrences/occurrence/hooks/use-settle-occurrence.hook.ts';
import { useUnsettleOccurrence } from '#/domain/recurrences/occurrence/hooks/use-unsettle-occurrence.hook.ts';
import { BillCreateModal } from '#/features/bills/bill-create/bill-create.viewmodel.tsx';
import { BillListView } from '#/features/bills/bill-list/bill-list.view.tsx';
import type { BillSectionsModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { buildBillRows } from '#/features/bills/bill-list/utils/build-bill-rows.util.ts';
import {
  buildFriendsModel,
  buildPayableModel,
} from '#/features/bills/bill-list/utils/build-total-model.util.ts';
import { describeInvoicesNote } from '#/features/bills/bill-list/utils/describe-invoices-note.util.ts';
import { getEndOfMonth } from '#/features/bills/bill-list/utils/get-end-of-month.util.ts';
import { resolvePaymentTarget } from '#/domain/bills/bill/rules/resolve-payment-target.rule.ts';
import { resolveRowStatus } from '#/domain/bills/bill/rules/resolve-row-status.rule.ts';
import { DebtCreateModal } from '#/features/bills/debt-create/debt-create.viewmodel.tsx';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import { useFoundPayment } from '#/features/bills/hooks/use-found-payment.hook.ts';
import { InvoiceLinkDialog } from '#/features/bills/invoice-link/invoice-link.viewmodel.tsx';
import { PaymentRegisterDialog } from '#/features/bills/payment-register/payment-register.viewmodel.tsx';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';
import { getBusinessToday } from '#/features/bills/utils/get-business-today.util.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

function indexItems(agenda: Agenda.Dto): Map<string, Agenda.Item> {
  const all = [
    ...agenda.thisMonth,
    ...agenda.openInvoices,
    ...agenda.receivable,
    ...agenda.undated,
    ...agenda.settled,
  ];
  return new Map(all.map((item) => [item.key, item]));
}

/**
 * Recorrentes › A pagar e receber: reads the agenda of the month, turns it into rows and answers
 * the actions of each row by its owner (bill, invoice or recurrence occurrence). It also mounts
 * the modals: new bill (`?new=bill`), friend debt (`?new=debt`) and the payment dialogs (`?pay=`).
 */
export function BillList() {
  const { month, monthLabel } = useSelectedMonth();
  const agendaQuery = useAgenda(month);
  const categories = useCategories({ status: 'all' });
  const accounts = useAccounts();
  const search = useBillSearch();
  const { showUndoToast } = useToast();
  const settleOccurrence = useSettleOccurrence();
  const unsettleOccurrence = useUnsettleOccurrence();
  const foundPayment = useFoundPayment();
  const [actionError, setActionError] = useState<string | null>(null);

  const agenda = agendaQuery.data;
  const itemsByKey = agenda ? indexItems(agenda) : new Map<string, Agenda.Item>();
  const payItem = search.payKey ? (itemsByKey.get(search.payKey) ?? null) : null;

  const categoryIcons = new Map<string, IconName>(
    (categories.data?.items ?? []).map((category) => [category.id, mapCategoryIcon(category.icon)]),
  );
  const accountNames = new Map<string, string>(
    (accounts.data?.items ?? []).map((account) => [
      account.id,
      account.institutionName ?? account.name,
    ]),
  );
  const context = { today: getBusinessToday(), categoryIcons, accountNames };
  const endOfMonth = getEndOfMonth(month);

  async function markOccurrencePaid(item: Agenda.Item, occurrenceId: string) {
    await settleOccurrence.mutateAsync(occurrenceId);
    showUndoToast({
      message: `${item.title} marcada como ${item.flow === 'in' ? 'recebida' : 'paga'}.`,
      withIcon: true,
      onUndo: () => unsettleOccurrence.mutate(occurrenceId),
    });
  }

  async function handleRowAction(key: string) {
    const item = itemsByKey.get(key);
    const target = item ? resolvePaymentTarget(item) : null;
    if (!item || !target) return;
    setActionError(null);

    try {
      if (target.kind === 'occurrence') {
        await markOccurrencePaid(item, target.occurrenceId);
      } else if (item.paymentFound || resolveRowStatus(item) !== 'paid-unlinked') {
        search.openPayment(key);
      } else {
        await foundPayment.link(item); // "Vincular" on a payment already detected only confirms it
      }
    } catch (error) {
      setActionError(describeApiError(error));
    }
  }

  const sections: BillSectionsModel = {
    thisMonth: buildBillRows(agenda?.thisMonth ?? [], context),
    openInvoices: buildBillRows(agenda?.openInvoices ?? [], context),
    receivable: buildBillRows(agenda?.receivable ?? [], context),
    undated: buildBillRows(agenda?.undated ?? [], context),
    settled: buildBillRows(agenda?.settled ?? [], context),
  };
  const isEmpty =
    sections.thisMonth.length +
      sections.openInvoices.length +
      sections.receivable.length +
      sections.undated.length ===
    0;
  const payableModel = agenda ? buildPayableModel(agenda, endOfMonth) : null;
  const friendsModel = agenda ? buildFriendsModel(agenda) : null;
  const closePayment = search.closePayment;
  const showsLink = payItem?.paymentFound && payItem.source.type === 'invoice';

  return (
    <>
      <BillListView
        status={agendaQuery.isPending ? 'loading' : agendaQuery.isError ? 'error' : 'ready'}
        onRetry={() => void agendaQuery.refetch()}
        payable={payableModel ?? { label: 'A pagar', totalCents: 0, caption: '', items: [] }}
        friends={
          friendsModel ?? { label: 'A receber de amigos', totalCents: 0, caption: '', items: [] }
        }
        sections={sections}
        thisMonthNote={`Até ${formatDayMonth(endOfMonth)}`}
        invoicesNote={describeInvoicesNote(agenda?.openInvoices ?? [])}
        settledTitle={`Quitadas em ${monthLabel.toLowerCase()}`}
        isEmpty={isEmpty}
        emptyTitle={`Nada a pagar até ${formatDayMonth(endOfMonth)}`}
        actionError={actionError}
        onDismissActionError={() => setActionError(null)}
        onRowAction={(key) => void handleRowAction(key)}
        onNewDebt={() => search.openNewModal('debt')}
      />
      <BillCreateModal />
      <DebtCreateModal />
      <InvoiceLinkDialog item={showsLink ? payItem : null} onClose={closePayment} />
      <PaymentRegisterDialog item={showsLink ? null : payItem} onClose={closePayment} />
    </>
  );
}
