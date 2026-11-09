import { Button, CategoryIcon, Icon, Money, Skeleton, type IconName } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { SectionError } from '#/shared/components/states/section-error.component.tsx';

import type {
  CategoryFiguresView,
  CategoryPageKind,
  PartStatus,
} from '#/features/categories/category-page/types/category-page-view.type.ts';

type FigureProps = {
  icon: IconName;
  label: string;
  children: ReactNode;
};

/** One figure: the label with its icon and the value under it, the way the totals of Transações read. */
function Figure({ icon, label, children }: FigureProps) {
  return (
    <div className="flex min-w-0 flex-col gap-s4">
      <p className="flex items-center gap-s8 text-label whitespace-nowrap text-fg-secondary">
        <Icon name={icon} size="sm" />
        {label}
      </p>
      <div className="flex h-8 items-center">{children}</div>
    </div>
  );
}

const DASH = (
  <span aria-label="Sem valor para este período" className="text-money-md text-fg-tertiary">
    —
  </span>
);

type CategorySummaryProps = {
  kind: CategoryPageKind;
  icon: IconName;
  archived: boolean;
  /** Does not count as spending: the total says so instead of a value. */
  isTransfer: boolean;
  status: PartStatus;
  figures: CategoryFiguresView | null;
  onEdit: () => void;
  onRetry: () => void;
};

/**
 * The top of the category page: its icon and "Editar", then the total of the period, the number of
 * transactions and the average per month (a category that is a transfer has neither a value nor
 * an average: it does not count as spending). Each figure has a fixed height, so the skeleton, a dash
 * and the number are the same box.
 */
export function CategorySummary({
  kind,
  icon,
  archived,
  isTransfer,
  status,
  figures,
  onEdit,
  onRetry,
}: CategorySummaryProps) {
  const isExpense = kind === 'expense';

  return (
    <section aria-label="Resumo da categoria" className="flex flex-col gap-s16">
      <div className="flex items-center justify-between gap-s16">
        <CategoryIcon icon={icon} size="lg" type={kind} dashed={archived} />
        <Button variant="secondary" size="sm" icon="edit" onPress={onEdit}>
          Editar
        </Button>
      </div>

      {status === 'error' ? (
        <SectionError what="os totais" onRetry={onRetry} />
      ) : (
        <div className="grid grid-cols-2 gap-x-s24 gap-y-s16 sm:flex sm:flex-wrap sm:gap-x-s48">
          <div className="col-span-2 sm:col-span-1">
            <Figure
              icon={isExpense ? 'arrow-down-right' : 'arrow-up-right'}
              label={
                figures?.totalLabel ?? (isExpense ? 'Gasto no período' : 'Recebido no período')
              }
            >
              {isTransfer ? (
                <span className="text-body font-medium text-fg-secondary">
                  Não conta como gasto
                </span>
              ) : figures ? (
                <Money
                  cents={figures.totalCents}
                  sign="none"
                  tone={isExpense ? 'expense' : 'income'}
                  className="text-money-md"
                />
              ) : (
                <Skeleton className="h-6 w-32" />
              )}
            </Figure>
          </div>
          <Figure icon="list" label="Transações">
            {figures ? (
              <span className="text-money-md font-numeric text-fg-primary tabular-nums">
                {figures.transactionCount}
              </span>
            ) : (
              <Skeleton className="h-6 w-12" />
            )}
          </Figure>
          {isTransfer ? null : (
            <Figure icon="calendar" label="Média por mês">
              {figures ? (
                figures.monthlyAverageCents === null ? (
                  DASH
                ) : (
                  <Money
                    cents={figures.monthlyAverageCents}
                    sign="none"
                    tone={isExpense ? 'expense' : 'income'}
                    className="text-money-md"
                  />
                )
              ) : (
                <Skeleton className="h-6 w-28" />
              )}
            </Figure>
          )}
        </div>
      )}
    </section>
  );
}
