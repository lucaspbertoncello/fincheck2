import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { FreeBalance } from '@fincheck/shared/dashboard/free-balance/free-balance.type.ts';
import { BankAvatar, resolveBankThemeKey } from '@fincheck/ui';
import type {
  FreeBalanceAccount,
  FreeBalanceData,
  FreeBalanceItem,
  FreeBalanceLine,
} from '@fincheck/ui';

import { buildPartialNotice } from '#/shared/layouts/application/summary/utils/build-partial-notice.util.ts';

type BuildFreeBalanceInput = {
  freeBalance: FreeBalance.Dto;
  accounts: readonly Account.Dto[];
  /** `/accounts` with the selected month: where "Ver mais" leads. */
  accountsHref: string;
};

const PRESUMED_NOTE = 'pago, falta vincular';

// R1: an item whose payment was detected but not linked yet carries the seal and already left the
// total (`remainingCents` is net of the presumed payment).
function toItems(items: readonly Agenda.Item[]): FreeBalanceItem[] {
  return items.map((item) => ({
    id: item.key,
    label: item.title,
    cents: item.remainingCents,
    badge: item.presumedPaidCents > 0 ? PRESUMED_NOTE : undefined,
  }));
}

function lastDayLabel(asOfOn: string): string {
  const [year = 0, month = 1] = asOfOn.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

// A count, not a title: a freelancer's name or a long description never fits the 296 px column.
function receivableSubtitle(items: readonly Agenda.Item[]) {
  if (items.length === 0) return undefined;
  return items.length === 1 ? '1 previsto' : `${items.length} previstos`;
}

function buildLines({ freeBalance }: BuildFreeBalanceInput): FreeBalanceLine[] {
  return [
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: receivableSubtitle(freeBalance.receivable.items),
      cents: freeBalance.receivable.totalCents,
      sign: 'plus',
      items: toItems(freeBalance.receivable.items),
    },
    {
      key: 'payable',
      label: 'A pagar',
      subtitle: `até ${lastDayLabel(freeBalance.asOfOn)}`,
      cents: freeBalance.payable.totalCents,
      sign: 'minus',
      items: toItems(freeBalance.payable.items),
    },
  ];
}

function buildAccounts({ freeBalance, accounts }: BuildFreeBalanceInput): FreeBalanceAccount[] {
  return freeBalance.accounts.items.map((item) => {
    const account = accounts.find((candidate) => candidate.id === item.accountId);
    const mark = (
      <BankAvatar
        theme={account?.type === 'wallet' ? 'wallet' : resolveBankThemeKey(item.institutionCode)}
        name={item.name}
        size={36}
      />
    );
    return {
      id: item.accountId,
      name: item.name,
      balanceCents: item.balanceCents,
      mark,
    };
  });
}

/**
 * Turns the Livre answer (plus the accounts) into what the panel draws: the big number is the sum
 * of the account balances (BR-DSH-002); `freeCents` is the old Livre, now "Sobra no fim do mês".
 */
export function buildFreeBalanceData(input: BuildFreeBalanceInput): FreeBalanceData {
  const { freeBalance } = input;
  return {
    balanceCents: freeBalance.accounts.totalCents,
    freeCents: freeBalance.freeBalanceCents,
    perDayCents: freeBalance.perDayCents,
    windowDays: freeBalance.daysRemaining,
    partialNote: buildPartialNotice(input.freeBalance, input.accounts),
    lines: buildLines(input),
    accounts: buildAccounts(input),
    moreAccountsHref: input.accountsHref,
  };
}
