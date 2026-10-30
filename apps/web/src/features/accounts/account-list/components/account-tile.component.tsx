import { AccountCard, ConnectionErrorNotice, OverflowMenu } from '@fincheck/ui';

import type { AccountTileData } from '#/features/accounts/account-list/types/account-list.type.ts';

const MEU_PLUGGY_URL = 'https://meu.pluggy.ai';

type AccountTileProps = {
  data: AccountTileData;
  onAction: (accountId: string) => void;
  onMenuAction: (accountId: string, key: string) => void;
};

/**
 * Account card of "Contas e cartões": the library `AccountCard` with the data of one account, its
 * "…" menu in the card's slot and, on a failed connection, the notice with the way out.
 */
export function AccountTile({ data, onAction, onMenuAction }: AccountTileProps) {
  const { sync } = data;

  return (
    <AccountCard
      theme={data.theme}
      name={data.name}
      subtitle={data.subtitle}
      badge={data.badge}
      balanceCents={data.balanceCents}
      curve={data.curve.map((point) => point.cents)}
      curveLabel={data.curveLabel}
      status={sync.tone}
      statusLabel={sync.label}
      statusSlot={
        sync.tone === 'failed' ? (
          <ConnectionErrorNotice reason={sync.reason} href={MEU_PLUGGY_URL} />
        ) : undefined
      }
      actionLabel={data.actionLabel}
      onAction={() => onAction(data.id)}
      menu={
        <OverflowMenu
          label={`Ações de ${data.name}`}
          items={data.menuItems}
          onAction={(key) => onMenuAction(data.id, key)}
          className="-mr-s8"
        />
      }
    />
  );
}
