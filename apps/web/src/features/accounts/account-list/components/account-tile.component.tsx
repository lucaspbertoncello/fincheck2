import {
  AccountSparkline,
  BankAvatar,
  Chip,
  ConnectionErrorNotice,
  Icon,
  Money,
  OverflowMenu,
  Button,
} from '@fincheck/ui';

import type { AccountTileData } from '#/features/accounts/account-list/types/account-list.type.ts';

const MEU_PLUGGY_URL = 'https://meu.pluggy.ai';

type AccountTileProps = {
  data: AccountTileData;
  onAction: (accountId: string) => void;
  onMenuAction: (accountId: string, key: string) => void;
};

/**
 * Account card of "Contas e cartões" (components.md 3.5): bank, balance, month curve, sync line and
 * action, plus the "…" menu for archive and delete, which the library card has no slot for.
 */
export function AccountTile({ data, onAction, onMenuAction }: AccountTileProps) {
  const { sync } = data;

  return (
    <article aria-label={data.name} className="glass flex flex-col gap-s12 p-s16">
      <header className="flex items-center gap-s12">
        <BankAvatar theme={data.theme} name={data.name} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-title text-body font-emphasis text-fg-primary">
            {data.name}
          </h3>
          <p className="truncate text-meta text-fg-secondary">{data.subtitle}</p>
        </div>
        <Chip tone={data.theme === 'wallet' ? 'neutral' : 'accent'}>{data.badge}</Chip>
        <OverflowMenu
          label={`Ações de ${data.name}`}
          items={data.menuItems}
          onAction={(key) => onMenuAction(data.id, key)}
          className="-mr-s8"
        />
      </header>

      <p className="text-money-xl text-fg-primary max-lg:text-(length:--font-size-money-xl-mobile)">
        {data.balanceCents === null ? (
          <span className="text-body text-fg-secondary">Aguardando o saldo do banco</span>
        ) : (
          <Money cents={data.balanceCents} sign="auto" />
        )}
      </p>

      <AccountSparkline points={data.curve} label={data.curveLabel} />

      <footer className="flex items-center justify-between gap-s12">
        {sync.tone === 'failed' ? (
          <ConnectionErrorNotice reason={sync.reason} href={MEU_PLUGGY_URL} />
        ) : (
          <p
            className={
              sync.tone === 'stale'
                ? 'flex items-center gap-s8 text-meta text-caution'
                : 'flex items-center gap-s8 text-meta text-fg-secondary'
            }
          >
            <Icon
              name={sync.tone === 'stale' ? 'warning' : sync.tone === 'manual' ? 'edit' : 'sync'}
              size="xs"
            />
            <span>{sync.label}</span>
          </p>
        )}
        {data.actionLabel ? (
          <Button variant="tertiary" size="sm" onPress={() => onAction(data.id)}>
            {data.actionLabel}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}
