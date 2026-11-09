import {
  Banner,
  BannerSlot,
  Chip,
  ConfirmDialog,
  DayStripSection,
  NeedsAttentionStrip,
  RecurrenceList,
  Section,
  SegmentedControl,
  TotalCard,
  type RecurrenceAction,
  type RecurrenceFlow,
  type TotalCardDetail,
} from '@fincheck/ui';
import type { Ref } from 'react';

import { MissingFilterChip } from '#/features/recurrences/recurrence-list/components/missing-filter-chip.component.tsx';
import { TOTAL_CARD_WORDS } from '#/features/recurrences/recurrence-list/constants/total-card-words.constant.ts';
import { FLOW_OPTIONS } from '#/features/recurrences/recurrence-list/constants/flow-options.constant.ts';
import { DayOccurrenceList } from '#/features/recurrences/recurrence-list/components/day-occurrence-list.component.tsx';
import { IdleRecurrenceRow } from '#/features/recurrences/recurrence-list/components/idle-recurrence-row.component.tsx';
import { OccurrenceRowItem } from '#/features/recurrences/recurrence-list/components/occurrence-row-item.component.tsx';
import { RecurrenceListEmpty } from '#/features/recurrences/recurrence-list/components/states/recurrence-list-empty.component.tsx';
import { LoadErrorState } from '#/shared/components/states/load-error-state.component.tsx';
import { RecurrenceListLoading } from '#/features/recurrences/recurrence-list/components/states/recurrence-list-loading.component.tsx';
import { ExpectedAmountViewModel } from '#/features/recurrences/recurrence-list/expected-amount/expected-amount.viewmodel.tsx';
import { LinkOccurrenceViewModel } from '#/features/recurrences/recurrence-list/link-occurrence/link-occurrence.viewmodel.tsx';
import { RecurrenceFormViewModel } from '#/features/recurrences/recurrence-form/recurrence-form.viewmodel.tsx';
import type {
  ActionErrorData,
  IdleRecurrenceData,
  OccurrenceChipData,
  OccurrenceDayData,
  OccurrenceRowData,
} from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type TotalCardData = { label: string; totalCents: number; details: TotalCardDetail[] };

type RecurrenceListViewProps = {
  state: 'loading' | 'error' | 'empty' | 'ready';
  onRetry: () => void;
  onCreate: () => void;
  actionError: ActionErrorData | null;
  flow: RecurrenceFlow;
  onFlowChange: (flow: RecurrenceFlow) => void;
  attentionRows: OccurrenceRowData[];
  card: TotalCardData;
  /**
   * `?show=missing`: the list and "Precisa de você" hold only what still lacks money. The strip of
   * days and "Sem dia certo" stay whole: they are the calendar of the month, not a list. The
   * screen scrolls to the start of the list when the filter arrives (`listScrollTarget`): the chip is
   * already at the top, the list is what is out of sight.
   */
  missingFilter: { isActive: boolean; onClear: () => void };
  /** The box of the list the screen scrolls to when `?show=missing` arrives. */
  listScrollTarget: Ref<HTMLDivElement>;
  strip: {
    title: string;
    days: OccurrenceDayData[];
    today: string;
    selectedDate: string;
    chips: OccurrenceChipData[];
  };
  rows: OccurrenceRowData[];
  idleRecurrences: IdleRecurrenceData[];
  onSelectDay: (date: string) => void;
  onRowAction: (row: OccurrenceRowData, action: RecurrenceAction) => void;
  onDecideDifference: (row: OccurrenceRowData, decision: 'update' | 'keep') => void;
  onResume: (recurrenceId: string, name: string) => void;
  onEditRecurrence: (recurrenceId: string) => void;
  deleteTarget: { recurrenceId: string; name: string } | null;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'recorrência' : 'recorrências'}`;
}

/** Recorrentes › Recorrências: the side selector, what needs you, the card, the strip, the list. */
export function RecurrenceListView(props: RecurrenceListViewProps) {
  const { state, onRetry, onCreate } = props;

  return (
    <>
      {state === 'loading' ? <RecurrenceListLoading /> : null}
      {state === 'error' ? <LoadErrorState what="as recorrências" onRetry={onRetry} /> : null}
      {state === 'empty' ? <RecurrenceListEmpty onCreate={onCreate} /> : null}
      {state === 'ready' ? <ReadyContent {...props} /> : null}
      <RecurrenceFormViewModel />
      <LinkOccurrenceViewModel />
      <ExpectedAmountViewModel />
      <ConfirmDialog
        isOpen={props.deleteTarget !== null}
        onOpenChange={(open) => !open && props.onCancelDelete()}
        destructive
        icon="trash"
        title={`Excluir ${props.deleteTarget?.name ?? 'a recorrência'}?`}
        description="Ela sai do Livre e das projeções, e as ocorrências futuras são apagadas. O que já foi confirmado fica no histórico."
        confirmLabel="Excluir"
        onConfirm={props.onConfirmDelete}
        loading={props.deleting}
      />
    </>
  );
}

function ReadyContent({
  actionError,
  flow,
  onFlowChange,
  attentionRows,
  card,
  missingFilter,
  listScrollTarget,
  strip,
  rows,
  idleRecurrences,
  onSelectDay,
  onRowAction,
  onDecideDifference,
  onResume,
  onEditRecurrence,
}: RecurrenceListViewProps) {
  return (
    <div className="flex flex-col gap-s24">
      <SegmentedControl
        direction
        label="Tipo de recorrência"
        options={FLOW_OPTIONS}
        value={flow}
        onChange={(key) => onFlowChange(key as RecurrenceFlow)}
        className="lg:w-[28rem]"
      />

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

      <MissingFilterChip isActive={missingFilter.isActive} onClear={missingFilter.onClear} />

      {attentionRows.length > 0 ? (
        <NeedsAttentionStrip countLabel={countLabel(attentionRows.length)}>
          {attentionRows.map((row) => (
            <OccurrenceRowItem
              key={row.occurrenceId}
              row={row}
              onAction={onRowAction}
              onDecideDifference={onDecideDifference}
            />
          ))}
        </NeedsAttentionStrip>
      ) : null}

      <TotalCard {...card} tone={flow} />

      <DayStripSection
        title={strip.title}
        variant="occurrences"
        days={strip.days}
        today={strip.today}
        selectedDate={strip.selectedDate}
        onSelectDate={onSelectDay}
        emptyDayLabel="Nada previsto neste dia"
        renderDay={(day) => <DayOccurrenceList items={day.items} />}
        footer={
          strip.chips.length > 0 ? (
            <ul aria-label="Sem dia certo" className="flex flex-wrap gap-s8">
              {strip.chips.map((chip) => (
                <li key={chip.key}>
                  <Chip tone={chip.tone} large>
                    {chip.label}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : null
        }
      />

      <div ref={listScrollTarget} className="scroll-mt-s16">
        <Section title={flow === 'income' ? 'Receitas' : 'Despesas fixas'}>
          {rows.length > 0 ? (
            <RecurrenceList>
              {rows.map((row) => (
                <OccurrenceRowItem key={row.occurrenceId} row={row} onAction={onRowAction} />
              ))}
            </RecurrenceList>
          ) : (
            <p className="text-body text-fg-secondary">
              {missingFilter.isActive
                ? TOTAL_CARD_WORDS[flow].emptyMissing
                : TOTAL_CARD_WORDS[flow].emptyList}
            </p>
          )}
        </Section>
      </div>

      {idleRecurrences.length > 0 ? (
        <Section title="Fora deste mês">
          <RecurrenceList>
            {idleRecurrences.map((recurrence) => (
              <IdleRecurrenceRow
                key={recurrence.recurrenceId}
                recurrence={recurrence}
                onResume={onResume}
                onEdit={onEditRecurrence}
              />
            ))}
          </RecurrenceList>
        </Section>
      ) : null}
    </div>
  );
}
