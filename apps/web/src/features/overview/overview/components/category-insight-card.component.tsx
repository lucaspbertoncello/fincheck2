import { Icon, Money } from '@fincheck/ui';

import type { CategoryInsight } from '#/features/overview/overview/overview.model.ts';

type CategoryInsightCardProps = {
  insight: CategoryInsight;
};

const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * "Delivery foi a que mais cresceu": the amber card at the right of the donut. It stretches to the
 * height of the legend (5 rows) and its content starts at the top (ui adjustment 11).
 */
export function CategoryInsightCard({ insight }: CategoryInsightCardProps) {
  const { categoryName, changeCents, changePct, transactionCount, previousMonthLabel } = insight;

  return (
    <div className="flex w-full items-start gap-s12 self-stretch rounded-panel bg-caution-weak p-s16 lg:w-80 lg:flex-none">
      <Icon name="trend" size="base" className="mt-s4 text-caution" />
      <p className="text-label text-fg-primary">
        <span className="font-emphasis">{categoryName}</span> foi a que mais cresceu:{' '}
        <Money cents={changeCents} sign="plus" weight="emphasis" />
        {changePct === null ? null : <> (+{percentFormat.format(changePct)}%)</>} que{' '}
        {previousMonthLabel}
        {transactionCount > 0
          ? `, com ${transactionCount} ${transactionCount === 1 ? 'lançamento' : 'lançamentos'}`
          : null}
        .
      </p>
    </div>
  );
}
