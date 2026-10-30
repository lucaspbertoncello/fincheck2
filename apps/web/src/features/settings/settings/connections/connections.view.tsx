import { Chip, ConfirmDialog, FineNote, Section } from '@fincheck/ui';

import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { SectionSkeleton } from '#/features/settings/settings/components/section-skeleton.component.tsx';
import { ConnectionRow } from '#/features/settings/settings/connections/components/connection-row.component.tsx';
import { PendingMatches } from '#/features/settings/settings/connections/components/pending-matches.component.tsx';
import {
  PluggySetup,
  type PluggySetupProps,
} from '#/features/settings/settings/connections/components/pluggy-setup.component.tsx';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type ConnectionsViewProps = {
  state: 'loading' | 'error' | 'setup' | 'ready';
  items: ConnectionItem[];
  /** The sentence under the action that failed. */
  actionError: string | null;
  onRetry: () => void;
  /** Name of the bank being disconnected: opens the confirmation. */
  disconnectingName: string | null;
  isDisconnecting: boolean;
  onAskDisconnect: (connectionId: string) => void;
  onCancelDisconnect: () => void;
  onConfirmDisconnect: () => void;
  choices: Record<string, string | null>;
  onChoose: (pluggyAccountId: string, accountId: string | null) => void;
  isSavingMatches: boolean;
  onConfirmMatches: (connectionId: string) => void;
  setup: PluggySetupProps;
};

/** "Conexões": the state of each bank and "Desconectar"; the search itself is automatic. */
export function ConnectionsView({
  state,
  items,
  actionError,
  onRetry,
  disconnectingName,
  isDisconnecting,
  onAskDisconnect,
  onCancelDisconnect,
  onConfirmDisconnect,
  choices,
  onChoose,
  isSavingMatches,
  onConfirmMatches,
  setup,
}: ConnectionsViewProps) {
  return (
    <Section
      title="Conexões"
      variant="glass"
      action={
        state === 'ready' ? (
          <Chip tone="ok" icon="check">
            Pluggy conectado
          </Chip>
        ) : undefined
      }
    >
      {state === 'loading' ? <SectionSkeleton label="Carregando as conexões" /> : null}
      {state === 'error' ? (
        <SectionError message="Não deu para carregar as conexões." onRetry={onRetry} />
      ) : null}
      {state === 'setup' ? <PluggySetup {...setup} /> : null}
      {state === 'ready' && items.length === 0 ? (
        <FineNote icon="plug">
          Nenhum banco conectado ainda. Conecte o primeiro pelo botão +, em Conectar conta.
        </FineNote>
      ) : null}
      {state === 'ready' && items.length > 0 ? (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-s16 border-t border-line py-s16 first:border-t-0 first:pt-0"
            >
              <ConnectionRow item={item} onDisconnect={() => onAskDisconnect(item.id)} />
              {item.pendingMatches.length > 0 ? (
                <PendingMatches
                  bankName={item.name}
                  matches={item.pendingMatches}
                  choices={choices}
                  onChoose={onChoose}
                  isSaving={isSavingMatches}
                  onConfirm={() => onConfirmMatches(item.id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-meta text-loss">
          {actionError}
        </p>
      ) : null}
      {state === 'ready' ? (
        <FineNote icon="clock">
          O app busca os dados de hora em hora, sozinho. Para voltar a receber de um banco com erro,
          reconecte no Meu Pluggy.
        </FineNote>
      ) : null}
      <ConfirmDialog
        isOpen={disconnectingName !== null}
        onOpenChange={(open) => {
          if (!open) onCancelDisconnect();
        }}
        destructive
        title={`Desconectar o ${disconnectingName ?? ''}?`}
        description="O app para de buscar dados desse banco."
        changes={[
          { text: 'As transações, as faturas e o histórico ficam no app.' },
          { text: 'As contas e os cartões do banco passam a ser manuais, com o último saldo.' },
          { icon: 'warning', text: 'Para revogar o acesso de vez, é no Meu Pluggy.' },
        ]}
        confirmLabel="Desconectar"
        loading={isDisconnecting}
        onConfirm={onConfirmDisconnect}
      />
    </Section>
  );
}
