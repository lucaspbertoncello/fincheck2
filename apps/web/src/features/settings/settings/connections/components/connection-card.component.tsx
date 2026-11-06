import { BankAvatar, Button, Chip, FineNote, Icon, LinkButton } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { MEU_PLUGGY_URL } from '#/features/settings/settings/connections/constants/meu-pluggy-url.constant.ts';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type ConnectionCardProps = {
  item: ConnectionItem;
  onDisconnect: () => void;
  /** The pending account choices (`PendingMatches`): they take the whole width, under the buttons. */
  pending?: ReactNode;
};

/**
 * One bank as a card (components.md 10.3, Polimento 13): the logo, the name and what the Open
 * Finance last did at the left, the state badge at the right (it drops under the name on the
 * phone); then the accounts and cards the bank brings; then, on a rule of their own, "Reconectar no
 * Open Finance" (only when the connection failed) and "Desconectar", both real buttons. The
 * destructive color lives only in the confirmation dialog that "Desconectar" opens.
 */
export function ConnectionCard({ item, onDisconnect, pending }: ConnectionCardProps) {
  const failed = item.status === 'error';
  const healthy = !failed && !item.isStale;

  return (
    <li>
      <article aria-label={item.name} className="glass flex flex-col gap-s16 p-s16 lg:p-s24">
        <div className="flex flex-col gap-s8 lg:flex-row lg:items-center lg:gap-s12">
          <div className="flex min-w-0 flex-1 items-center gap-s12">
            <BankAvatar theme={item.bankTheme} name={item.name} size={48} />
            <div className="flex min-w-0 flex-col gap-s4">
              <h3
                title={item.name}
                className="truncate font-title text-section leading-(--line-height-title) font-heading text-fg-primary"
              >
                {item.name}
              </h3>
              <p className="text-label whitespace-nowrap text-fg-secondary">{item.updateLine}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-s8 lg:ml-auto">
            {healthy ? (
              <Chip tone="ok" icon="check">
                Conectado
              </Chip>
            ) : null}
            {failed ? (
              <Chip tone="warn" icon="warning">
                Conexão com erro
              </Chip>
            ) : null}
            {item.isStale ? (
              <Chip tone="warn" icon="clock">
                Dados desatualizados
              </Chip>
            ) : null}
          </div>
        </div>

        {failed ? (
          <p className="flex items-start gap-s8 text-label text-caution">
            <Icon name="warning" size="sm" className="mt-px shrink-0" />
            <span>{item.errorReason ?? 'Reconecte para voltar a receber os dados.'}</span>
          </p>
        ) : null}
        {item.historyLine ? <FineNote icon="clock">{item.historyLine}</FineNote> : null}

        <div className="flex flex-col gap-s8">
          <p className="text-meta text-fg-secondary">Contas e cartões que o banco traz</p>
          {item.accounts.length > 0 ? (
            <ul className="flex flex-wrap gap-s8">
              {item.accounts.map((account) => (
                <li key={account.id}>
                  <Chip icon={account.icon} large>
                    {account.name} · {account.kindLabel}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-label text-fg-secondary">Nenhuma conta ou cartão lido ainda.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-s8 border-t border-line pt-s16">
          {failed ? (
            <LinkButton
              href={MEU_PLUGGY_URL}
              target="_blank"
              variant="primary"
              size="sm"
              icon="link"
            >
              Reconectar no Open Finance
            </LinkButton>
          ) : null}
          <Button variant="secondary" size="sm" onPress={onDisconnect}>
            Desconectar <span className="sr-only">{item.name}</span>
          </Button>
        </div>

        {pending}
      </article>
    </li>
  );
}
