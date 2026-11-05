import { BankAvatar, Button, Chip, ListRow } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { MEU_PLUGGY_URL } from '#/features/settings/settings/connections/constants/meu-pluggy-url.constant.ts';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type ConnectionRowProps = {
  item: ConnectionItem;
  onDisconnect: () => void;
  /** The pending account choices (`PendingMatches`): they take the whole strip, under the buttons. */
  pending?: ReactNode;
};

/**
 * One bank on the standard list row: mark, name with its badges ("Conexão com erro", "Dados
 * desatualizados"), what the Open Finance last did (or the error reason) as the detail, and on the
 * strip "Desconectar", the way back to the Open Finance when it failed and the pending choices.
 */
export function ConnectionRow({ item, onDisconnect, pending }: ConnectionRowProps) {
  const failed = item.status === 'error';
  const detail = failed
    ? (item.errorReason ?? 'Reconecte para voltar a receber os dados.')
    : [item.updateLine, item.historyLine].filter(Boolean).join(' · ');
  const badges = [
    failed ? (
      <Chip key="error" tone="warn" icon="warning">
        Conexão com erro
      </Chip>
    ) : null,
    item.isStale ? (
      <Chip key="stale" tone="warn">
        Dados desatualizados
      </Chip>
    ) : null,
  ].filter((badge) => badge !== null);
  const [firstBadge, secondBadge] = badges;

  return (
    <ListRow
      mark={<BankAvatar theme={item.bankTheme} name={item.name} size={40} />}
      name={item.name}
      badges={firstBadge ? (secondBadge ? [firstBadge, secondBadge] : [firstBadge]) : undefined}
      detail={detail}
      detailTitle={detail}
      actions={
        <>
          <Button variant="tertiary" size="sm" onPress={onDisconnect}>
            Desconectar <span className="sr-only">{item.name}</span>
          </Button>
          {failed ? (
            <Link
              href={MEU_PLUGGY_URL}
              target="_blank"
              rel="noreferrer"
              className="focus-ring cursor-pointer rounded-tiny text-label font-emphasis text-brand underline underline-offset-2 data-[hovered]:no-underline"
            >
              Reconectar no Open Finance
            </Link>
          ) : null}
          {pending ? <div className="w-full">{pending}</div> : null}
        </>
      }
      className="border-t border-line first:border-t-0"
    />
  );
}
