import { Banner, BannerSlot, ContentSkeleton, EmptyState, TotalCard } from '@fincheck/ui';

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
  onRowEdit,
  onRowOpenInvoice,
  onDebtEdit,
  onDebtDelete,
  onNewDebt,
}: BillListViewProps) {
  if (status === 'loading') return <ContentSkeleton variant="list" />;

  const withMenu = Object.values(sections).some((rows) => rows.some((row) => row.debt));

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
      <div className="grid items-start gap-s16 lg:grid-cols-2 lg:gap-s24">
        {[
          { card: payable, tone: 'expense' as const },
          { card: friends, tone: 'income' as const },
        ].map(({ card, tone }) => (
          <TotalCard
            key={card.label}
            tone={tone}
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
            onRowEdit={onRowEdit}
            onRowOpenInvoice={onRowOpenInvoice}
            withMenu={withMenu}
            onDebtEdit={onDebtEdit}
            onDebtDelete={onDebtDelete}
          />
          <BillAgendaSection
            title="Faturas abertas"
            note={invoicesNote}
            rows={sections.openInvoices}
            onRowAction={onRowAction}
            onRowEdit={onRowEdit}
            onRowOpenInvoice={onRowOpenInvoice}
            withMenu={withMenu}
            onDebtEdit={onDebtEdit}
            onDebtDelete={onDebtDelete}
          />
          <BillAgendaSection
            title="A receber"
            intro="O que você pagou por alguém. O reembolso abate e não vira receita."
            rows={sections.receivable}
            onRowAction={onRowAction}
            onRowEdit={onRowEdit}
            onRowOpenInvoice={onRowOpenInvoice}
            withMenu={withMenu}
            onDebtEdit={onDebtEdit}
            onDebtDelete={onDebtDelete}
          />
          <BillAgendaSection
            title="Sem data"
            note="Fora do Livre"
            rows={sections.undated}
            onRowAction={onRowAction}
            onRowEdit={onRowEdit}
            onRowOpenInvoice={onRowOpenInvoice}
            withMenu={withMenu}
            onDebtEdit={onDebtEdit}
            onDebtDelete={onDebtDelete}
          />
        </>
      )}

      <BillAgendaSection
        title={settledTitle}
        rows={sections.settled}
        onRowAction={onRowAction}
        onRowEdit={onRowEdit}
        onRowOpenInvoice={onRowOpenInvoice}
        withMenu={withMenu}
        onDebtEdit={onDebtEdit}
        onDebtDelete={onDebtDelete}
      />
    </div>
  );
}
