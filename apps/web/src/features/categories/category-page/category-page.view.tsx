import {
  Banner,
  Button,
  ConfirmDialog,
  ContentSkeleton,
  EmptyState,
  MonthBarsChart,
  Section,
} from '@fincheck/ui';

import { CategoryForm } from '#/features/categories/category-form/category-form.component.tsx';
import { CategoryPageFrame } from '#/features/categories/category-page/components/category-page-frame.component.tsx';
import { CategorySummary } from '#/features/categories/category-page/components/category-summary.component.tsx';
import type { CategoryPageViewProps } from '#/features/categories/category-page/types/category-page-view.type.ts';
import { DayList } from '#/features/transactions/transaction-list/components/day-list.component.tsx';
import { LoadMore } from '#/features/transactions/transaction-list/components/load-more.component.tsx';
import { LoadFailed } from '#/features/transactions/transaction-list/components/states/load-failed.component.tsx';

const NO_SELECTION: ReadonlySet<string> = new Set();

/**
 * The category page (BR-CAT-010): the way back, the title and the period picker, the figures, the
 * 12 monthly bars and the transactions of the category by month and day. Every state is here: the
 * category loading, failing or not found; each part loading, failing or empty. Everything arrives
 * ready in props.
 */
export function CategoryPageView(props: CategoryPageViewProps) {
  const { status } = props;

  if (status !== 'ready') {
    return (
      <CategoryPageFrame
        title={status === 'not-found' ? 'Categoria não encontrada' : 'Categoria'}
        description={status === 'not-found' ? 'Esse endereço não leva a uma categoria.' : ' '}
        backHref={props.backHref}
      >
        {status === 'loading' ? <ContentSkeleton variant="sections" /> : null}
        {status === 'error' ? (
          <Banner
            variant="error"
            title="Não deu para carregar a categoria"
            description="Confira se o app está rodando e tente de novo."
            actionLabel="Tentar de novo"
            onAction={props.onRetry}
          />
        ) : null}
        {status === 'not-found' ? (
          <EmptyState
            icon="search"
            title="Essa categoria não existe"
            description="Ela pode ter sido apagada, ou o endereço está errado."
            primaryAction={{ label: 'Voltar para Categorias', onPress: props.onBack }}
          />
        ) : null}
      </CategoryPageFrame>
    );
  }

  return (
    <CategoryPageFrame
      title={props.name}
      description={props.description}
      backHref={props.backHref}
      picker={props.picker}
    >
      {props.actionError ? (
        <Banner
          variant="error"
          title={props.actionError.message}
          actionLabel="Fechar"
          onAction={props.actionError.onClose}
        />
      ) : null}

      <CategorySummary
        kind={props.kind}
        icon={props.icon}
        archived={props.archived}
        status={props.figuresStatus}
        figures={props.figures}
        onEdit={props.onEdit}
        onRetry={props.onRetry}
      />

      <Section title="Últimos 12 meses">
        {props.trendStatus === 'ready' && props.trend ? (
          <MonthBarsChart
            title={props.trend.title}
            valueLabel={props.trend.valueLabel}
            bars={props.trend.bars}
            highlightKey={props.trend.highlightKey}
            emptyMessage={props.trend.emptyMessage}
          />
        ) : null}
        {props.trendStatus === 'loading' ? (
          <div aria-hidden="true" className="skeleton-pulse h-50 w-full rounded-panel bg-track" />
        ) : null}
        {props.trendStatus === 'error' ? (
          <div className="flex h-50 flex-col items-start justify-center gap-s8">
            <p className="text-body text-fg-secondary">Não deu para carregar as barras.</p>
            <Button variant="secondary" size="sm" onPress={props.onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </Section>

      {props.listStatus === 'loading' ? <ContentSkeleton variant="list" /> : null}
      {props.listStatus === 'error' ? <LoadFailed onRetry={props.onRetry} /> : null}
      {props.empty ? (
        <EmptyState
          icon="list"
          title={props.empty.title}
          description={props.empty.description}
          primaryAction={
            props.empty.onShowAll
              ? { label: 'Ver todo o histórico', onPress: props.empty.onShowAll }
              : undefined
          }
        />
      ) : null}

      {props.months.length > 0 ? (
        <div className="flex flex-col gap-s32">
          {props.months.map((month) => (
            <Section
              key={month.key}
              title={month.label}
              action={<span className="text-meta text-fg-secondary">{month.countLabel}</span>}
            >
              <DayList
                days={month.days}
                selectionActive={false}
                selectedIds={NO_SELECTION}
                handlers={props.rowHandlers}
              />
            </Section>
          ))}
          {props.hasMore ? (
            <LoadMore
              onWatchEnd={props.watchEnd}
              onLoadMore={props.onLoadMore}
              loading={props.loadingMore}
            />
          ) : null}
        </div>
      ) : null}

      <CategoryForm
        target={props.form.target}
        onClose={props.form.onClose}
        onArchive={props.form.onArchive}
        onRestore={props.form.onRestore}
      />
      {props.archiveDialog ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => !open && props.archiveDialog?.onClose()}
          title={props.archiveDialog.title}
          description={props.archiveDialog.description}
          icon="archive"
          changes={props.archiveDialog.changes}
          confirmLabel={props.archiveDialog.confirmLabel}
          loading={props.archiveDialog.loading}
          onConfirm={props.archiveDialog.onConfirm}
        />
      ) : null}
    </CategoryPageFrame>
  );
}
