import {
  Banner,
  ConfirmDialog,
  ContentSkeleton,
  EmptyState,
  ReviewStrip,
  RuleSuggestionBanner,
  Section,
  SelectionBar,
  SyncErrorBanner,
} from '@fincheck/ui';

import { BulkPickerModal } from '#/features/transactions/transaction-list/components/bulk-picker-modal.component.tsx';
import { ByCategory } from '#/features/transactions/transaction-list/components/by-category/by-category.component.tsx';
import { DayFilterChip } from '#/features/transactions/transaction-list/components/day-filter-chip.component.tsx';
import { DayList } from '#/features/transactions/transaction-list/components/day-list.component.tsx';
import { FiltersModal } from '#/features/transactions/transaction-list/components/filters-modal.component.tsx';
import { LoadMore } from '#/features/transactions/transaction-list/components/load-more.component.tsx';
import { ListControls } from '#/features/transactions/transaction-list/components/list-controls.component.tsx';
import { MonthTotals } from '#/features/transactions/transaction-list/components/month-totals.component.tsx';
import { TransactionEditModal } from '#/features/transactions/transaction-list/components/transaction-edit-modal.component.tsx';
import { TransactionSplitModal } from '#/features/transactions/transaction-list/components/transaction-split-modal.component.tsx';
import { LoadFailed } from '#/features/transactions/transaction-list/components/states/load-failed.component.tsx';
import type { TransactionListViewProps } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

/**
 * Transações, lista e por categoria: controls, month totals, the "para revisar" strip, the days with
 * their rows (or the by-category groups), the selection bar and the dialogs. Everything arrives
 * ready in props; the View only composes the design system.
 */
export function TransactionListView(props: TransactionListViewProps) {
  const { controls, status } = props;
  const isCategoryView = controls.view === 'category';

  return (
    <div className="flex flex-col gap-s24">
      <ListControls controls={controls} />

      {props.syncFailures.map((failure) => (
        <SyncErrorBanner
          key={failure.connectionId}
          institution={failure.institution}
          detail={failure.detail}
          retrying={failure.retrying}
          onRetry={failure.onRetry}
        />
      ))}
      {!isCategoryView && props.dayFilter ? <DayFilterChip filter={props.dayFilter} /> : null}

      {props.actionError ? (
        <Banner
          variant="error"
          title={props.actionError.message}
          actionLabel="Fechar"
          onAction={props.actionError.onClose}
        />
      ) : null}

      {isCategoryView ? <CategoryContent {...props} /> : null}
      {!isCategoryView && status === 'loading' ? <ContentSkeleton variant="list" /> : null}
      {!isCategoryView && status === 'error' ? <LoadFailed onRetry={props.onRetry} /> : null}
      {!isCategoryView && status === 'ready' ? <ListContent {...props} /> : null}

      {props.selectionActive && props.selectedIds.size > 0 ? (
        <SelectionBar
          count={props.selectedIds.size}
          onAction={props.onSelectionAction}
          onClose={props.onSelectionClose}
        />
      ) : null}

      {props.editor ? <TransactionEditModal editor={props.editor} /> : null}
      {props.splitter ? <TransactionSplitModal splitter={props.splitter} /> : null}
      <FiltersModal filters={props.filters} />
      <BulkPickerModal bulk={props.bulkPicker} />
      {props.confirm ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) props.confirm?.onClose();
          }}
          title={props.confirm.title}
          description={props.confirm.description}
          destructive={props.confirm.destructive}
          confirmLabel={props.confirm.confirmLabel}
          loading={props.confirm.loading}
          onConfirm={props.confirm.onConfirm}
        />
      ) : null}
    </div>
  );
}

function RuleQuestion({ question }: { question: TransactionListViewProps['ruleQuestion'] }) {
  if (!question) return null;

  return (
    <div className="flex flex-col gap-s8">
      <RuleSuggestionBanner
        message={question.message}
        onCreate={question.onCreate}
        onDismiss={question.onDismiss}
      />
      {question.error ? <span className="text-label text-loss">{question.error}</span> : null}
    </div>
  );
}

function ListContent(props: TransactionListViewProps) {
  const { totals, reviewCount, days } = props;

  return (
    <div className="flex flex-col gap-s24">
      {totals ? <MonthTotals totals={totals} /> : null}
      {reviewCount > 0 ? <ReviewStrip count={reviewCount} onReview={props.onReview} /> : null}
      <RuleQuestion question={props.ruleQuestion} />

      {props.emptyReason === 'month' ? (
        <EmptyState
          icon="list"
          title={props.emptyTitle}
          description="Conecte suas contas para trazer o extrato, ou lance uma transação à mão."
          primaryAction={{ label: 'Conectar contas', onPress: props.onConnectAccounts }}
          secondaryAction={{ label: 'Lançar transação', onPress: props.onNewTransaction }}
        />
      ) : null}
      {props.emptyReason === 'day' && props.dayFilter ? (
        <EmptyState
          icon="calendar"
          title={`Nenhuma transação no ${props.dayFilter.label.toLowerCase()}`}
          description="Nesse dia não houve lançamentos neste mês."
          primaryAction={{ label: 'Mostrar o mês todo', onPress: props.dayFilter.onClear }}
        />
      ) : null}
      {props.emptyReason === 'filtered' ? (
        <EmptyState
          icon="search"
          title="Nenhuma transação com esses filtros"
          description="Tente outra busca ou tire algum filtro."
          primaryAction={{ label: 'Limpar filtros', onPress: props.onClearFilters }}
        />
      ) : null}

      {days.length > 0 ? (
        <>
          {props.months ? (
            // A wider period: the days under their month, the month as the heading.
            <div className="flex flex-col gap-s32">
              {props.months.map((month, index) => (
                <Section
                  key={month.key}
                  title={month.label}
                  divider={index > 0}
                  action={<span className="text-meta text-fg-secondary">{month.countLabel}</span>}
                >
                  <DayList
                    days={month.days}
                    selectionActive={props.selectionActive}
                    selectedIds={props.selectedIds}
                    handlers={props.rowHandlers}
                  />
                </Section>
              ))}
            </div>
          ) : (
            <DayList
              days={days}
              selectionActive={props.selectionActive}
              selectedIds={props.selectedIds}
              handlers={props.rowHandlers}
            />
          )}
          {props.hasMore ? (
            <LoadMore
              onWatchEnd={props.watchEnd}
              onLoadMore={props.onLoadMore}
              loading={props.loadingMore}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function CategoryContent(props: TransactionListViewProps) {
  if (props.byCategoryStatus === 'loading') return <ContentSkeleton variant="sections" />;
  if (props.byCategoryStatus === 'error') return <LoadFailed onRetry={props.onRetry} />;
  if (props.byCategoryEmpty) {
    return (
      <EmptyState
        icon="search"
        title="Nenhuma categoria ou transação com esse nome"
        description="Tente outro nome ou limpe a busca."
      />
    );
  }

  return props.byCategory ? <ByCategory data={props.byCategory} /> : null;
}
