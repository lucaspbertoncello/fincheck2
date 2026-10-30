import {
  AddAccountCard,
  Banner,
  ContentSkeleton,
  EmptyState,
  ErrorState,
  Money,
  Section,
  SyncErrorBanner,
} from '@fincheck/ui';
import type { ReactNode } from 'react';

import { AccountTile } from '#/features/accounts/account-list/components/account-tile.component.tsx';
import { CardBlock } from '#/features/accounts/account-list/components/card-block.component.tsx';
import type {
  AccountTileData,
  CardBlockData,
  ConnectionFailureData,
  HistoryProgressData,
} from '#/features/accounts/account-list/types/account-list.type.ts';

const GRID_CLASS = 'grid grid-cols-1 items-start gap-s16 lg:grid-cols-2 lg:gap-s24';

export type AccountListViewProps = {
  state: 'loading' | 'error' | 'empty' | 'ready';
  onRetry: () => void;
  progress: readonly HistoryProgressData[];
  failures: readonly ConnectionFailureData[];
  onRetryConnection: (connectionId: string) => void;
  /** An action that failed ("Não deu para arquivar a Carteira"), shown where the action is. */
  actionError: string | null;
  cards: readonly CardBlockData[];
  accounts: readonly AccountTileData[];
  archived: readonly AccountTileData[];
  totalCents: number;
  /** The future invoices of one card; when present they take the place of the cards. */
  futureSlot?: ReactNode;
  onConnect: () => void;
  onViewInvoice: (cardId: string, month: string) => void;
  onCorrectInvoice: (cardId: string, month: string) => void;
  onOpenFuture: (cardId: string) => void;
  onCardMenuAction: (cardId: string, key: string) => void;
  onAccountAction: (accountId: string) => void;
  onAccountMenuAction: (accountId: string, key: string) => void;
};

/** Contas e cartões: sync strips, credit cards with invoices, accounts and "Conectar outra conta". */
export function AccountListView({
  state,
  onRetry,
  progress,
  failures,
  onRetryConnection,
  actionError,
  cards,
  accounts,
  archived,
  totalCents,
  futureSlot,
  onConnect,
  onViewInvoice,
  onCorrectInvoice,
  onOpenFuture,
  onCardMenuAction,
  onAccountAction,
  onAccountMenuAction,
}: AccountListViewProps) {
  if (state === 'loading') return <ContentSkeleton variant="cards" />;

  if (state === 'error') {
    return (
      <ErrorState
        title="Não deu para carregar as contas"
        description="Confira se a API está no ar e tente de novo."
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-s24">
      {actionError ? <Banner variant="error" title={actionError} /> : null}
      {progress.map((item) => (
        <Banner
          key={item.connectionId}
          variant="suggestion"
          title={item.title}
          description={item.detail}
        />
      ))}
      {failures.map((item) => (
        <SyncErrorBanner
          key={item.connectionId}
          institution={item.institution}
          detail={item.detail}
          actionLabel="Buscar de novo"
          retrying={item.retrying}
          onRetry={() => onRetryConnection(item.connectionId)}
        />
      ))}

      {state === 'empty' ? (
        <EmptyState
          icon="plug"
          title="Nenhuma conta ainda"
          description="Conecte um banco pelo Meu Pluggy ou crie uma conta manual."
          primaryAction={{ label: 'Conectar conta', onPress: onConnect, icon: 'plug' }}
        />
      ) : (
        <>
          {futureSlot ??
            (cards.length > 0 ? (
              <Section title="Cartões de crédito" divider={false}>
                <div className={GRID_CLASS}>
                  {cards.map((card) => (
                    <CardBlock
                      key={card.id}
                      data={card}
                      onViewInvoice={onViewInvoice}
                      onCorrectInvoice={onCorrectInvoice}
                      onOpenFuture={onOpenFuture}
                      onMenuAction={onCardMenuAction}
                    />
                  ))}
                </div>
              </Section>
            ) : null)}

          <Section
            title="Contas"
            divider={false}
            action={
              <span className="flex items-baseline gap-s8 text-label text-fg-secondary">
                Total <Money cents={totalCents} sign="auto" weight="emphasis" />
              </span>
            }
          >
            <div className={GRID_CLASS}>
              {accounts.map((account) => (
                <AccountTile
                  key={account.id}
                  data={account}
                  onAction={onAccountAction}
                  onMenuAction={onAccountMenuAction}
                />
              ))}
              <AddAccountCard
                title="Conectar outra conta"
                subtitle="Banco do Brasil, Inter, Itaú, Caixa e outros 6"
                onPress={onConnect}
              />
            </div>
          </Section>

          {archived.length > 0 ? (
            <Section title="Arquivadas">
              <div className={GRID_CLASS}>
                {archived.map((account) => (
                  <AccountTile
                    key={account.id}
                    data={account}
                    onAction={onAccountAction}
                    onMenuAction={onAccountMenuAction}
                  />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
