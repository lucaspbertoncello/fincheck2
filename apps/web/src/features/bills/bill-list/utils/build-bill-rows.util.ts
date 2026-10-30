import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { BillBadge, IconName } from '@fincheck/ui';

import type { BillRowModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { describeDueDate } from '#/features/bills/bill-list/utils/describe-due-date.util.ts';
import { resolveRowStatus } from '#/features/bills/bill-list/utils/resolve-row-status.util.ts';

type RowContext = {
  today: string;
  categoryIcons: ReadonlyMap<string, IconName>;
  accountNames: ReadonlyMap<string, string>;
};

function resolveBadges(item: Agenda.Item): BillBadge[] {
  switch (item.badge) {
    case 'recurring':
      return [{ label: 'Recorrente' }];
    case 'invoice':
      return [{ label: item.invoiceState === 'open' ? 'Fatura aberta' : 'Fatura' }];
    case 'debt':
      return [{ label: 'Dívida' }];
    case 'friend_receivable':
      return [{ label: 'Você pagou' }];
    default:
      return [];
  }
}

function resolveIcon(item: Agenda.Item, context: RowContext): IconName {
  if (item.badge === 'invoice') return 'card';
  const fromCategory = item.categoryId ? context.categoryIcons.get(item.categoryId) : undefined;
  if (fromCategory) return fromCategory;
  if (item.badge === 'recurring') return 'repeat';
  if (item.badge === 'debt' || item.badge === 'friend_receivable') return 'debt';
  return 'receipt';
}

function describeFoundPayment(item: Agenda.Item, context: RowContext): string | undefined {
  if (!item.paymentFound) return undefined;
  const account = context.accountNames.get(item.paymentFound.accountId);
  return account ? `Pagamento encontrado no ${account}` : 'Pagamento encontrado';
}

/** The agenda items as rows of `BillRow`: status, badges, due text and the found-payment chip. */
export function buildBillRows(items: readonly Agenda.Item[], context: RowContext): BillRowModel[] {
  return items.map((item) => {
    const status = resolveRowStatus(item);

    return {
      key: item.key,
      name: item.title,
      icon: resolveIcon(item, context),
      flow: item.flow === 'in' ? 'income' : 'expense',
      status,
      badges: resolveBadges(item),
      dueText: describeDueDate(item, context.today),
      foundPayment: describeFoundPayment(item, context),
      amountCents: item.amountCents,
      settledCents: status === 'partial' ? item.paidCents : undefined,
      actionable: status !== 'settled',
    };
  });
}
