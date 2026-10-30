import { BankAvatar, Button, Chip, ConnectionErrorNotice } from '@fincheck/ui';

import { MEU_PLUGGY_URL } from '#/features/settings/settings/connections/constants/meu-pluggy-url.constant.ts';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type ConnectionRowProps = {
  item: ConnectionItem;
  onDisconnect: () => void;
};

/** One bank: mark, name, what the Pluggy last did (or the error) and "Desconectar". */
export function ConnectionRow({ item, onDisconnect }: ConnectionRowProps) {
  return (
    <div className="flex items-start justify-between gap-s16 max-lg:flex-col">
      <div className="flex min-w-0 items-start gap-s12">
        <BankAvatar theme={item.bankTheme} name={item.name} size={40} />
        <div className="flex min-w-0 flex-col gap-s4">
          <p className="flex flex-wrap items-center gap-s8 text-body font-emphasis text-fg-primary">
            {item.name}
            {item.isStale ? <Chip tone="warn">Dados desatualizados</Chip> : null}
          </p>
          {item.status === 'error' ? (
            <ConnectionErrorNotice reason={item.errorReason ?? undefined} href={MEU_PLUGGY_URL} />
          ) : (
            <p className="text-meta text-fg-secondary">{item.updateLine}</p>
          )}
          {item.historyLine ? (
            <p className="text-meta text-fg-secondary">{item.historyLine}</p>
          ) : null}
        </div>
      </div>
      <Button variant="tertiary" size="sm" onPress={onDisconnect}>
        Desconectar <span className="sr-only">{item.name}</span>
      </Button>
    </div>
  );
}
