import { Banner, BannerSlot, Button, ContentSkeleton, EmptyState, Section } from '@fincheck/ui';

import { FriendRow } from '#/features/bills/friend-list/components/friend-row.component.tsx';
import type { FriendListViewProps } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { LoadErrorState } from '#/shared/components/states/load-error-state.component.tsx';

/**
 * Recorrentes › Amigos: one row per person with the balance, each opening the debts with that
 * person. Loading, error and the empty state ("Nenhuma dívida com amigos ainda") are here;
 * everything arrives ready in props.
 */
export function FriendListView({
  status,
  onRetry,
  actionError,
  onDismissActionError,
  people,
  isOpen,
  onToggle,
  scrollKey,
  onNewDebt,
  onNewDebtFor,
  onDebtEdit,
  onDebtDelete,
  onDebtRegister,
}: FriendListViewProps) {
  if (status === 'loading') return <ContentSkeleton variant="list" />;
  if (status === 'error') return <LoadErrorState what="as dívidas com amigos" onRetry={onRetry} />;

  return (
    <div className="flex flex-col gap-s24">
      <BannerSlot isOpen={Boolean(actionError)}>
        {actionError ? (
          <Banner
            variant="error"
            title={actionError}
            actionLabel="Fechar aviso"
            onAction={onDismissActionError}
          />
        ) : null}
      </BannerSlot>
      {status === 'empty' ? (
        <EmptyState
          icon="people"
          title="Nenhuma dívida com amigos ainda"
          description="O que você deve a alguém, ou que alguém deve a você, aparece aqui por pessoa."
          primaryAction={{ label: 'Nova dívida', onPress: onNewDebt }}
        />
      ) : (
        <Section
          title="Pessoas"
          divider={false}
          action={
            <Button size="sm" onPress={onNewDebt}>
              Nova dívida
            </Button>
          }
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {people.map((friend, index) => (
              <FriendRow
                key={friend.key}
                friend={friend}
                first={index === 0}
                isOpen={isOpen(friend.key)}
                onToggle={onToggle}
                scrollTo={scrollKey === friend.key}
                onNewDebt={onNewDebtFor}
                onDebtEdit={onDebtEdit}
                onDebtDelete={onDebtDelete}
                onDebtRegister={onDebtRegister}
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
