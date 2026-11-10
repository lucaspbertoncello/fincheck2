import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { BillBadge, IconName, ServiceLogoData } from '@fincheck/ui';

import type { BillRowModel } from '#/features/bills/bill-list/bill-list.model.ts';
import { describeDueDate } from '#/features/bills/utils/describe-due-date.util.ts';
import { resolveRowStatus } from '#/domain/bills/bill/rules/resolve-row-status.rule.ts';

type RowContext = {
  today: string;
  categoryIcons: ReadonlyMap<string, IconName>;
  accountNames: ReadonlyMap<string, string>;
  /** Recurrence id -> its logo (BR-REC-017); a recurrence with no logo is not in the map. */
  serviceLogos: ReadonlyMap<string, ServiceLogoData>;
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

/** The logo of the recurrence behind a recurring item, or 
ull (the category icon stays). */
function resolveServiceLogo(item: Agenda.Item, context: RowContext): ServiceLogoData | null {
  const recurrenceId = item.badge === 'recurring' ? item.source.recurrenceId : null;
  return recurrenceId ? (context.serviceLogos.get(recurrenceId) ?? null) : null;
}

function describeFoundPayment(item: Agenda.Item, context: RowContext): string | undefined {
  if (!item.paymentFound) return undefined;
  const account = context.accountNames.get(item.paymentFound.accountId);
  return account ? `Pagamento encontrado no ${account}` : 'Pagamento encontrado';
}

/** The friend debts (to pay or to receive) are the rows with a "…" menu. */
function resolveDebt(item: Agenda.Item): BillRowModel['debt'] {
  const isDebt = item.badge === 'debt' || item.badge === 'friend_receivable';
  if (!isDebt || item.source.type !== 'bill' || !item.source.billId) return undefined;

  return { billId: item.source.billId, person: item.counterparty };
}

/** The agenda items as rows of `BillRow`: status, badges, due text and the found-payment chip. */
export function buildBillRows(items: readonly Agenda.Item[], context: RowContext): BillRowModel[] {
  return items.map((item) => {
    const status = resolveRowStatus(item);

    return {
      key: item.key,
      name: item.title,
      icon: resolveIcon(item, context),
      service: resolveServiceLogo(item, context),
      flow: item.flow === 'in' ? 'income' : 'expense',
      status,
      badges: resolveBadges(item),
      dueText: describeDueDate(item, context.today),
      foundPayment: describeFoundPayment(item, context),
      amountCents: item.amountCents,
      settledCents: status === 'partial' ? item.paidCents : undefined,
      actionable: status !== 'settled',
      editBillId:
        status !== 'settled' && item.badge === 'bill' && item.source.type === 'bill'
          ? (item.source.billId ?? undefined)
          : undefined,
      debt: resolveDebt(item),
      invoiceTarget:
        item.source.type === 'invoice' && item.source.accountId && item.source.month
          ? { accountId: item.source.accountId, month: item.source.month }
          : undefined,
    };
  });
}
