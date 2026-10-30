import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { BankAvatar, BankCardMini, resolveBankThemeKey } from '@fincheck/ui';
import type {
  FreeBalanceAccount,
  FreeBalanceData,
  FreeBalanceInvoice,
  FreeBalanceItem,
  FreeBalanceLine,
} from '@fincheck/ui';

import {
  describeDataAge,
  describeUpdateTime,
} from '#/shared/layouts/application/summary/utils/describe-update-time.util.ts';
import { formatMoneyText } from '#/shared/layouts/application/summary/utils/format-money-text.util.ts';
import { formatShortDate } from '#/shared/layouts/application/summary/utils/format-short-date.util.ts';

type BuildFreeBalanceInput = {
  freeBalance: FreeBalance.Dto;
  accounts: readonly Account.Dto[];
  openInvoices: readonly Invoice.OpenItem[];
  /** `/transactions/review` with the selected month. */
  reviewHref: string;
  isHidden: boolean;
  now: Date;
};

const PRESUMED_NOTE = 'pago, falta vincular';

const INVOICE_STATUS_LABEL: Partial<Record<Invoice.Status, string>> = {
  open: 'Aberta',
  closed: 'Fechada',
  partial: 'Parcial',
  overdue: 'Vencida',
};

// R1: an item whose payment was detected but not linked yet carries the note and already left the
// total (`remainingCents` is net of the presumed payment).
function itemLabel(item: Agenda.Item): string {
  return item.presumedPaidCents > 0 ? `${item.title} · ${PRESUMED_NOTE}` : item.title;
}

function toItems(items: readonly Agenda.Item[]): FreeBalanceItem[] {
  return items.map((item) => ({
    id: item.key,
    label: itemLabel(item),
    cents: item.remainingCents,
  }));
}

function lastDayLabel(asOfOn: string): string {
  const [year = 0, month = 1] = asOfOn.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

function receivableSubtitle(items: readonly Agenda.Item[], isHidden: boolean) {
  const first = items[0];
  if (!first) return undefined;
  const more = items.length > 1 ? ` e mais ${items.length - 1}` : '';
  return `${formatMoneyText(first.remainingCents, isHidden)} ainda esperado (${first.title})${more}`;
}

function buildLines({ freeBalance, isHidden }: BuildFreeBalanceInput): FreeBalanceLine[] {
  return [
    {
      key: 'balance',
      label: 'Saldo nas contas',
      cents: freeBalance.accounts.totalCents,
      sign: 'plus',
      items: freeBalance.accounts.items.map((item) => ({
        id: item.accountId,
        label: item.name,
        cents: item.balanceCents,
      })),
    },
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: receivableSubtitle(freeBalance.receivable.items, isHidden),
      cents: freeBalance.receivable.totalCents,
      sign: 'plus',
      items: toItems(freeBalance.receivable.items),
    },
    {
      key: 'payable',
      label: 'A pagar',
      subtitle: `até ${lastDayLabel(freeBalance.asOfOn)} e faturas abertas`,
      cents: freeBalance.payable.totalCents,
      sign: 'minus',
      items: toItems(freeBalance.payable.items),
    },
  ];
}

function buildAccounts({
  freeBalance,
  accounts,
  now,
}: BuildFreeBalanceInput): FreeBalanceAccount[] {
  const staleConnections = new Set(
    freeBalance.dataFreshness
      .filter((entry) => entry.isStale || entry.status === 'error')
      .map((entry) => entry.connectionId),
  );

  return freeBalance.accounts.items.map((item) => {
    const account = accounts.find((candidate) => candidate.id === item.accountId);
    const mark = (
      <BankAvatar
        theme={account?.type === 'wallet' ? 'wallet' : resolveBankThemeKey(item.institutionCode)}
        name={item.name}
        size={36}
      />
    );
    if (item.source === 'manual' || !account?.connection) {
      return {
        id: item.accountId,
        name: item.name,
        subtitle: item.source === 'manual' ? 'Saldo manual' : 'Sem conexão',
        balanceCents: item.balanceCents,
        mark,
      };
    }
    const hasError = account.connection.status === 'error';
    const isStale = staleConnections.has(account.connection.connectionId);
    return {
      id: item.accountId,
      name: item.name,
      subtitle: hasError
        ? 'Conexão com erro'
        : describeUpdateTime(account.connection.lastBankUpdateAt, now),
      subtitleTone: hasError || isStale ? 'warn' : 'normal',
      balanceCents: item.balanceCents,
      mark,
    };
  });
}

function buildInvoices({ accounts, openInvoices }: BuildFreeBalanceInput): FreeBalanceInvoice[] {
  return openInvoices.map(({ accountId, invoice }) => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    const status = INVOICE_STATUS_LABEL[invoice.status] ?? 'Aberta';
    return {
      id: `${accountId}:${invoice.month}`,
      name: account?.name ?? 'Cartão',
      subtitle: `${status}, vence ${formatShortDate(invoice.dueOn)}`,
      amountCents: invoice.remainingCents,
      mark: <BankCardMini theme={resolveBankThemeKey(account?.institutionCode)} />,
    };
  });
}

function buildReviewSubtitle({ freeBalance, accounts }: BuildFreeBalanceInput): string {
  const { byAccount } = freeBalance.review;
  const only = byAccount.length === 1 ? byAccount[0] : undefined;
  if (only) {
    const name = accounts.find((account) => account.id === only.accountId)?.name;
    return name ? `Sem categoria, do ${name}` : 'Sem categoria';
  }
  return byAccount.length > 1 ? `Sem categoria, de ${byAccount.length} contas` : 'Sem categoria';
}

/** "dado do Bradesco de ontem" or "conexão do Bradesco com erro", for the stale chip of the hero. */
function buildStaleNote({ freeBalance, now }: BuildFreeBalanceInput): string | undefined {
  const notes = freeBalance.dataFreshness.flatMap((entry) => {
    if (entry.status === 'error') return [`conexão do ${entry.institutionName} com erro`];
    if (entry.isStale) {
      return [`dado do ${entry.institutionName} ${describeDataAge(entry.lastBankUpdateAt, now)}`];
    }
    return [];
  });
  return notes.length > 0 ? notes.join(' · ') : undefined;
}

/** Turns the Livre answer (plus accounts and open invoices) into what the panel draws. */
export function buildFreeBalanceData(input: BuildFreeBalanceInput): FreeBalanceData {
  const { freeBalance } = input;
  return {
    freeCents: freeBalance.freeBalanceCents,
    perDayCents: freeBalance.perDayCents,
    windowDays: freeBalance.daysRemaining,
    elapsedDays: 0,
    staleNote: buildStaleNote(input),
    lines: buildLines(input),
    review:
      freeBalance.review.count > 0
        ? {
            count: freeBalance.review.count,
            subtitle: buildReviewSubtitle(input),
            href: input.reviewHref,
          }
        : undefined,
    accounts: buildAccounts(input),
    invoices: buildInvoices(input),
  };
}

/** R2: "Livre parcial: falta o saldo do Nubank". Undefined when every balance is known. */
export function buildPartialNotice(
  freeBalance: FreeBalance.Dto,
  accounts: readonly Account.Dto[],
): string | undefined {
  if (!freeBalance.isPartial) return undefined;
  const names = freeBalance.accountsWithoutBalance.map(
    (id) => accounts.find((account) => account.id === id)?.name ?? 'uma conta',
  );
  if (names.length === 0) return 'Livre parcial: falta o saldo de uma conta';
  return `Livre parcial: falta o saldo ${names.length > 1 ? 'das contas' : 'do'} ${names.join(', ')}`;
}
