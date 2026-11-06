import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { BalanceHistory } from '@fincheck/shared/accounts/balance-history/balance-history.type.ts';
import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

import type {
  AccountSyncLine,
  AccountTileData,
} from '#/features/accounts/account-list/types/account-list.type.ts';
import { buildAccountSubtitle } from '#/features/accounts/account-list/utils/build-account-subtitle.util.ts';
import { buildBalanceCurve } from '#/features/accounts/account-list/utils/build-balance-curve.util.ts';
import { buildAccountMenuItems } from '#/features/accounts/account-list/utils/build-account-menu-items.util.ts';
import { describeConnectionError } from '#/features/accounts/account-list/utils/describe-connection-error.util.ts';
import { formatSyncAge } from '#/features/accounts/account-list/utils/format-sync-age.util.ts';
import { resolveAccountTheme } from '#/features/accounts/utils/resolve-account-theme.util.ts';

type BuildAccountTileInput = {
  account: Account.Dto;
  /** The connection the account belongs to, for the "stale" flag. */
  connection: Connection.Dto | undefined;
  history: BalanceHistory.Dto | undefined;
  now: Date;
};

function buildSyncLine(
  account: Account.Dto,
  connection: Connection.Dto | undefined,
  now: Date,
): AccountSyncLine {
  if (account.source === 'manual' || !account.connection) {
    return { tone: 'manual', label: 'Saldo manual' };
  }

  if (account.connection.status === 'error') {
    return {
      tone: 'failed',
      label: 'Conexão com erro',
      reason: describeConnectionError(account.connection.errorCode),
    };
  }

  const updatedAt = account.connection.lastBankUpdateAt;
  const label = updatedAt
    ? `Atualizado pelo banco ${formatSyncAge(updatedAt, now)}`
    : 'Aguardando a primeira atualização do banco';

  return { tone: connection?.isStale ? 'stale' : 'ok', label };
}

/** An account card ready to draw: theme, balance, curve, sync line, action and menu. */
export function buildAccountTile({
  account,
  connection,
  history,
  now,
}: BuildAccountTileInput): AccountTileData {
  const canAdjust = account.source === 'manual' && !account.archivedAt;
  const isWallet = account.type === 'wallet';

  return {
    id: account.id,
    theme: isWallet ? 'wallet' : resolveAccountTheme(account),
    name: account.name,
    subtitle: buildAccountSubtitle(account.type),
    badge: account.source === 'pluggy' ? 'Open Finance' : 'Manual',
    balanceCents: account.balanceCents,
    curve: buildBalanceCurve(history),
    curveLabel: `Saldo de ${account.name} no mês`,
    sync: buildSyncLine(account, connection, now),
    actionLabel: canAdjust ? (isWallet ? 'Atualizar saldo' : 'Ajustar saldo') : undefined,
    menuItems: buildAccountMenuItems(Boolean(account.archivedAt)),
  };
}
