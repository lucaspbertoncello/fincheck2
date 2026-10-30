import { CategoriesSection } from '#/features/overview/overview/components/categories-section.component.tsx';
import { DayStripBlock } from '#/features/overview/overview/components/day-strip-block.component.tsx';
import { OverviewHeaderExtra } from '#/features/overview/overview/components/overview-header-extra.component.tsx';
import { SectionError } from '#/features/overview/overview/components/states/section-error.component.tsx';
import { SectionSkeleton } from '#/features/overview/overview/components/states/section-skeleton.component.tsx';
import { SpendSection } from '#/features/overview/overview/components/spend-section.component.tsx';
import { SummaryCardsSection } from '#/features/overview/overview/components/summary-cards-section.component.tsx';
import type { OverviewModel } from '#/features/overview/overview/overview.model.ts';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/**
 * Visão geral. Desktop order: summary cards, "Até o fim do mês", "Gasto do mês", "Por categoria".
 * The header and, on the phone, the panel come from the `ScreenFrame`. On the phone the strip
 * comes before the cards (`order`), as in the capture. Each block loads,
 * fails and retries on its own.
 */
export function OverviewView(model: OverviewModel) {
  const { summary, strip, spend, categories } = model;

  return (
    <ScreenFrame
      screen={SCREENS.overview}
      extra={<OverviewHeaderExtra remaining={model.remaining} alerts={model.alerts} />}
    >
      <div className="flex flex-col gap-s24">
        <div className="order-2 lg:order-1">
          {summary.status === 'loading' ? (
            <SectionSkeleton label="Carregando o resumo do mês" bodyClassName="h-32" />
          ) : summary.status === 'error' ? (
            <SectionError what="o resumo do mês" onRetry={summary.retry} />
          ) : (
            <SummaryCardsSection data={summary.data} />
          )}
        </div>

        <div className="order-1 lg:order-2">
          {strip.status === 'loading' ? (
            <SectionSkeleton label="Carregando os dias até o fim do mês" bodyClassName="h-48" />
          ) : strip.status === 'error' ? (
            <SectionError what="os dias até o fim do mês" onRetry={strip.retry} />
          ) : (
            <DayStripBlock
              data={strip.data}
              selectedDate={model.selectedDate}
              onSelectDate={model.onSelectDate}
              billsHref={model.billsHref}
            />
          )}
        </div>

        <div className="order-3">
          {spend.status === 'loading' ? (
            <SectionSkeleton label="Carregando o gasto do mês" bodyClassName="h-64" />
          ) : spend.status === 'error' ? (
            <SectionError what="o gasto do mês" onRetry={spend.retry} />
          ) : (
            <SpendSection data={spend.data} />
          )}
        </div>

        <div className="order-4">
          {categories.status === 'loading' ? (
            <SectionSkeleton label="Carregando o gasto por categoria" bodyClassName="h-48" />
          ) : categories.status === 'error' ? (
            <SectionError what="o gasto por categoria" onRetry={categories.retry} />
          ) : (
            <CategoriesSection
              data={categories.data}
              isCollapsible={!model.isDesktop}
              allCategoriesHref={model.allCategoriesHref}
            />
          )}
        </div>
      </div>
    </ScreenFrame>
  );
}
