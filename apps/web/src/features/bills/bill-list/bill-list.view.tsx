import { Banner, ContentSkeleton, EmptyState, TotalCard } from '@fincheck/ui';

import type { BillListViewProps } from '#/features/bills/bill-list/bill-list.model.ts';
import { BillAgendaSection } from '#/features/bills/bill-list/components/bill-agenda-section.component.tsx';

export function BillListView({
  status,
  onRetry,
  payable,
  friends,
  sections,
  thisMonthNote,
  invoicesNote,
  settledTitle,
  isEmpty,
  emptyTitle,
  actionError,
  onDismissActionError,
  onRowAction,
  onNewDebt,
}: BillListViewProps) {
  if (status === 'loading') return <ContentSkeleton variant="list" />;

  if (status === 'error') {
    return (
      <Banner
        variant="error"
        title="Não deu para carregar as contas"
        description="Confira se a API está no ar e tente de novo."
        actionLabel="Tentar de novo"
        onAction={onRetry}
      />
    );
  }

  return (
    <div className="flex flex-col gap-s24">
      {actionError ? (
        <Banner
          variant="error"
          title={actionError}
          actionLabel="Fechar aviso"
          onAction={onDismissActionError}
        />
      ) : null}
      <div className="grid items-start gap-s16 lg:grid-cols-2 lg:gap-s24">
        {[payable, friends].map((card) => (
          <TotalCard
            key={card.label}
            label={card.label}
            totalCents={card.totalCents}
            caption={card.caption}
            items={card.items.length > 0 ? card.items : undefined}
          />
        ))}
      </div>

      {isEmpty ? (
        <EmptyState
          icon="calendar"
          title={emptyTitle}
          description="Contas, faturas e dívidas com amigos aparecem aqui."
          primaryAction={{ label: 'Lançar dívida com amigo', onPress: onNewDebt }}
        />
      ) : (
        <>
          <BillAgendaSection
            title="Este mês"
            note={thisMonthNote}
            rows={sections.thisMonth}
            divider={false}
            onRowAction={onRowAction}
          />
          <BillAgendaSection
            title="Faturas abertas"
            note={invoicesNote}
            rows={sections.openInvoices}
            onRowAction={onRowAction}
          />
          <BillAgendaSection
            title="A receber"
            intro="O que você pagou por alguém. O reembolso abate e não vira receita."
            rows={sections.receivable}
            onRowAction={onRowAction}
          />
          <BillAgendaSection
            title="Sem data"
            note="Fora do Livre"
            rows={sections.undated}
            onRowAction={onRowAction}
          />
        </>
      )}

      <BillAgendaSection title={settledTitle} rows={sections.settled} onRowAction={onRowAction} />
    </div>
  );
}
