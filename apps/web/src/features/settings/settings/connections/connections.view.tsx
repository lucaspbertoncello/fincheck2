import { Collapse, ConfirmDialog, EmptyState, ErrorState, Section } from '@fincheck/ui';

import type { PluggySetupProps } from '#/features/settings/settings/connections/types/pluggy-setup-props.type.ts';
import { SettingsPageFrame } from '#/features/settings/settings/components/settings-page-frame.component.tsx';
import { SETTINGS_SECTION } from '#/shared/constants/settings/settings-sections.constant.ts';
import { SectionSkeleton } from '#/shared/components/states/section-skeleton.component.tsx';
import { AutoRefreshCard } from '#/features/settings/settings/connections/components/auto-refresh-card.component.tsx';
import { ConnectionCard } from '#/features/settings/settings/connections/components/connection-card.component.tsx';
import { OpenFinanceSummary } from '#/features/settings/settings/connections/components/open-finance-summary.component.tsx';
import { PendingMatches } from '#/features/settings/settings/connections/components/pending-matches.component.tsx';
import { PluggySetup } from '#/features/settings/settings/connections/components/pluggy-setup.component.tsx';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

type ConnectionsViewProps = {
  state: 'loading' | 'error' | 'setup' | 'ready';
  items: ConnectionItem[];
  /** The sentence under the action that failed. */
  actionError: string | null;
  onRetry: () => void;
  /** Opens the flow that connects the first bank (Contas e cartões). */
  onConnect: () => void;
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

const PAGE = SETTINGS_SECTION.connections;

/**
 * "Conexões": one page, three possible bodies. Loading and error keep the header; before the keys
 * there is the setup; after, the group of connected banks and the one that says how often the app
 * reads them (the search itself is automatic).
 */
export function ConnectionsView({
  state,
  items,
  actionError,
  onRetry,
  onConnect,
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
    <SettingsPageFrame title={PAGE.title} description={PAGE.description}>
      {state === 'loading' ? (
        <Section title="Bancos conectados" divider={false}>
          <SectionSkeleton label="Carregando as conexões" rows={3} />
        </Section>
      ) : null}
      {state === 'error' ? (
        <ErrorState
          title="Não deu para carregar as conexões."
          description="Confira se o app está rodando e tente de novo."
          onRetry={onRetry}
        />
      ) : null}
      {state === 'setup' ? (
        <Section title="Ligar o Open Finance" divider={false}>
          <PluggySetup {...setup} />
          <Collapse
            isOpen={Boolean(actionError)}
            trackClassName="-mt-s16"
            contentClassName="pt-s16"
          >
            {actionError ? (
              <p role="alert" className="text-meta text-loss">
                {actionError}
              </p>
            ) : null}
          </Collapse>
        </Section>
      ) : null}
      {state === 'ready' && items.length === 0 ? (
        <EmptyState
          icon="plug"
          title="Nenhum banco conectado ainda"
          description="Conecte o primeiro em Contas e cartões: o app passa a ler as contas e as faturas sozinho."
          primaryAction={{ label: 'Conectar conta', icon: 'plus-circle', onPress: onConnect }}
        />
      ) : null}
      {state === 'ready' && items.length > 0 ? (
        <>
          <Section title="Conexão" divider={false}>
            <OpenFinanceSummary
              bankCount={items.length}
              accountCount={items.reduce((total, item) => total + item.accounts.length, 0)}
              attentionCount={
                items.filter((item) => item.status === 'error' || item.isStale).length
              }
            />
          </Section>
          <Section title="Bancos conectados">
            <ul className="flex flex-col gap-s16">
              {items.map((item) => (
                <ConnectionCard
                  key={item.id}
                  item={item}
                  onDisconnect={() => onAskDisconnect(item.id)}
                  pending={
                    item.pendingMatches.length > 0 ? (
                      <PendingMatches
                        bankName={item.name}
                        matches={item.pendingMatches}
                        choices={choices}
                        onChoose={onChoose}
                        isSaving={isSavingMatches}
                        onConfirm={() => onConfirmMatches(item.id)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </ul>
            <Collapse
              isOpen={Boolean(actionError)}
              trackClassName="-mt-s16"
              contentClassName="pt-s16"
            >
              {actionError ? (
                <p role="alert" className="text-meta text-loss">
                  {actionError}
                </p>
              ) : null}
            </Collapse>
          </Section>
        </>
      ) : null}
      {state === 'ready' ? (
        <Section title="Atualização">
          <AutoRefreshCard />
        </Section>
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
          { icon: 'warning', text: 'Para revogar o acesso de vez, é no Open Finance.' },
        ]}
        confirmLabel="Desconectar"
        loading={isDisconnecting}
        onConfirm={onConfirmDisconnect}
      />
    </SettingsPageFrame>
  );
}
