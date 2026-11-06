import { Banner, BannerSlot, ConfirmDialog, Section, TotalCard } from '@fincheck/ui';

import type { SubscriptionRowAction } from '#/features/recurrences/subscription-list/types/subscription-row-action.type.ts';
import { Reveal } from '#/features/recurrences/subscription-list/components/reveal.component.tsx';
import { SubscriptionListEmpty } from '#/features/recurrences/subscription-list/components/states/subscription-list-empty.component.tsx';
import { LoadErrorState } from '#/shared/components/states/load-error-state.component.tsx';
import { SubscriptionListLoading } from '#/features/recurrences/subscription-list/components/states/subscription-list-loading.component.tsx';
import { SubscriptionRow } from '#/features/recurrences/subscription-list/components/subscription-row.component.tsx';
import { SubscriptionSuggestion } from '#/features/recurrences/subscription-list/components/subscription-suggestion.component.tsx';
import { RecurrenceFormViewModel } from '#/features/recurrences/recurrence-form/recurrence-form.viewmodel.tsx';
import type {
  ActionErrorData,
  SubscriptionRowData,
  SubscriptionSuggestionData,
} from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

type RowEntry = { row: SubscriptionRowData; present: boolean; isNew: boolean };
type SuggestionEntry = { suggestion: SubscriptionSuggestionData; present: boolean; isNew: boolean };

type SubscriptionListViewProps = {
  state: 'loading' | 'error' | 'empty' | 'ready';
  onRetry: () => void;
  onCreate: () => void;
  actionError: ActionErrorData | null;
  summary: { monthlyTotalCents: number; yearlyTotalCents: number; activeCount: number };
  suggestions: SuggestionEntry[];
  activeRows: RowEntry[];
  endedRows: RowEntry[];
  onRowAction: (row: SubscriptionRowData, action: SubscriptionRowAction) => void;
  onAcceptSuggestion: (suggestion: SubscriptionSuggestionData) => void;
  onDismissSuggestion: (suggestion: SubscriptionSuggestionData) => void;
  deleteTarget: { recurrenceId: string; name: string } | null;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'assinatura ativa' : 'assinaturas ativas'}`;
}

/** Recorrentes › Assinaturas: the totals, the suggestions and the subscriptions of the month. */
export function SubscriptionListView(props: SubscriptionListViewProps) {
  const { state, onRetry, onCreate } = props;

  return (
    <>
      {state === 'loading' ? <SubscriptionListLoading /> : null}
      {state === 'error' ? <LoadErrorState what="as assinaturas" onRetry={onRetry} /> : null}
      {state === 'empty' ? <SubscriptionListEmpty onCreate={onCreate} /> : null}
      {state === 'ready' ? <ReadyContent {...props} /> : null}
      <RecurrenceFormViewModel />
      <ConfirmDialog
        isOpen={props.deleteTarget !== null}
        onOpenChange={(open) => !open && props.onCancelDelete()}
        destructive
        icon="trash"
        title={`Excluir ${props.deleteTarget?.name ?? 'a assinatura'}?`}
        description="Ela sai do Livre e das projeções, e as cobranças futuras são apagadas. O que já foi cobrado fica no histórico."
        confirmLabel="Excluir"
        onConfirm={props.onConfirmDelete}
        loading={props.deleting}
      />
    </>
  );
}

function RowList({
  entries,
  onRowAction,
}: {
  entries: RowEntry[];
  onRowAction: SubscriptionListViewProps['onRowAction'];
}) {
  const firstVisible = entries.findIndex((entry) => entry.present);

  return (
    <ul className="flex flex-col">
      {entries.map(({ row, present, isNew }, index) => (
        <li key={row.recurrenceId}>
          <Reveal show={present} animateEnter={isNew}>
            <SubscriptionRow row={row} first={index === firstVisible} onAction={onRowAction} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

function ReadyContent({
  actionError,
  summary,
  suggestions,
  activeRows,
  endedRows,
  onRowAction,
  onAcceptSuggestion,
  onDismissSuggestion,
}: SubscriptionListViewProps) {
  const hasSuggestions = suggestions.some((entry) => entry.present);
  const hasActive = activeRows.some((entry) => entry.present);
  const hasEnded = endedRows.some((entry) => entry.present);

  return (
    <div className="flex flex-col gap-s24">
      <BannerSlot isOpen={Boolean(actionError)}>
        {actionError ? (
          <Banner
            variant="error"
            title="Não foi possível concluir"
            description={actionError.message}
            actionLabel="Tentar de novo"
            onAction={actionError.onRetry}
          />
        ) : null}
      </BannerSlot>

      <div className="grid gap-s16 lg:grid-cols-2 lg:gap-s24">
        <TotalCard
          label="Por mês"
          totalCents={summary.monthlyTotalCents}
          caption={countLabel(summary.activeCount)}
        />
        <TotalCard
          label="Por ano"
          totalCents={summary.yearlyTotalCents}
          caption="O total do mês vezes 12"
        />
      </div>

      <Reveal show={hasSuggestions} trackClassName="-mt-s24" contentClassName="pt-s12">
        <section aria-label="Sugestões de assinatura">
          {suggestions.map(({ suggestion, present, isNew }) => (
            <Reveal
              key={suggestion.key}
              show={present}
              animateEnter={isNew}
              contentClassName="pt-s12"
            >
              <SubscriptionSuggestion
                suggestion={suggestion}
                onAccept={onAcceptSuggestion}
                onDismiss={onDismissSuggestion}
              />
            </Reveal>
          ))}
        </section>
      </Reveal>

      <Section title="Assinaturas">
        {hasActive ? (
          <RowList entries={activeRows} onRowAction={onRowAction} />
        ) : (
          <p className="text-body text-fg-secondary">Nenhuma assinatura ativa neste mês.</p>
        )}
      </Section>

      <Reveal show={hasEnded} trackClassName="-mt-s24" contentClassName="pt-s24">
        <Section title="Encerradas que cobraram">
          <RowList entries={endedRows} onRowAction={onRowAction} />
        </Section>
      </Reveal>
    </div>
  );
}
