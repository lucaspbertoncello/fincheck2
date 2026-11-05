import { useState } from 'react';

import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCategoryBreakdown } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown.hook.ts';
import { useMonthSummary } from '#/domain/dashboard/month-summary/hooks/use-month-summary.hook.ts';
import { useSpendingCurve } from '#/domain/dashboard/spending-curve/hooks/use-spending-curve.hook.ts';
import { useTimeline } from '#/domain/dashboard/timeline/hooks/use-timeline.hook.ts';
import { useOverviewSearch } from '#/features/overview/overview/hooks/use-overview-search.hook.ts';
import type { OverviewModel } from '#/features/overview/overview/overview.model.ts';
import { OverviewView } from '#/features/overview/overview/overview.view.tsx';
import { buildAlerts } from '#/features/overview/overview/utils/build-alerts.util.ts';
import { buildCategories } from '#/features/overview/overview/utils/build-categories.util.tsx';
import { buildRemainingLine } from '#/features/overview/overview/utils/build-remaining-line.util.ts';
import { buildSpend } from '#/features/overview/overview/utils/build-spend.util.ts';
import { buildStrip } from '#/features/overview/overview/utils/build-strip.util.ts';
import { pickDefaultDate } from '#/features/overview/overview/utils/pick-default-date.util.ts';
import { buildSummaryCards } from '#/features/overview/overview/utils/build-summary-cards.util.ts';
import { toSectionState } from '#/features/overview/overview/utils/to-section-state.util.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';

/** Where "Ver todas" lands: Transações in its "Por categoria" view (the `view` param belongs to that screen). */
const BY_CATEGORY_PATH = '/transactions?view=category';

/** Where the three summary cards lead: Receitas to Recorrentes, Despesas to the expenses, Resultado to every transaction. */
const SUMMARY_PATHS = {
  income: '/recurrences',
  expense: '/transactions?type=expense',
  result: '/transactions',
} as const;

function useOverviewModel(): OverviewModel {
  const isDesktop = useIsDesktop();
  const { month } = useSelectedMonth();
  const { strip: stripMode, setStrip } = useOverviewSearch();
  const [chosen, setChosen] = useState<{ month: string; date: string } | null>(null);

  const monthSummary = useMonthSummary(month);
  const timeline = useTimeline(month);
  const curve = useSpendingCurve(month);
  const breakdown = useCategoryBreakdown(month);
  const categories = useCategories({ status: 'all' });

  const strip = toSectionState(timeline, buildStrip);
  const defaultDate = strip.status === 'ready' ? pickDefaultDate(strip.data.days) : '';
  // The chosen day belongs to the month it was chosen in; another month goes back to the default.
  const selectedDate = chosen?.month === month ? chosen.date : defaultDate;

  return {
    month,
    isDesktop,
    remaining: {
      // Loading keeps the line's skeleton; a loaded month without `remaining` has no line.
      isVisible: monthSummary.isPending || (monthSummary.data?.remaining ?? null) !== null,
      data: monthSummary.data ? buildRemainingLine(monthSummary.data) : undefined,
    },
    alerts: monthSummary.data
      ? buildAlerts(monthSummary.data.alerts, {
          settings: buildHref('/settings/connections', month),
          recurrences: buildHref('/recurrences', month),
        })
      : [],
    summary: toSectionState(monthSummary, (data) =>
      buildSummaryCards(month, data, curve.data, breakdown.data),
    ),
    strip,
    stripMode,
    onStripModeChange: setStrip,
    selectedDate,
    onSelectDate: (date) => setChosen({ month, date }),
    spend: toSectionState(curve, buildSpend),
    categories:
      categories.isError || breakdown.isError
        ? {
            status: 'error',
            retry: () => {
              void breakdown.refetch();
              void categories.refetch();
            },
          }
        : !breakdown.data || !categories.data
          ? { status: 'loading' }
          : {
              status: 'ready',
              data: buildCategories(month, breakdown.data, categories.data.items),
            },
    billsHref: buildHref('/recurrences/bills', month),
    summaryLinks: {
      income: buildHref(SUMMARY_PATHS.income, month),
      expense: buildHref(SUMMARY_PATHS.expense, month),
      result: buildHref(SUMMARY_PATHS.result, month),
    },
    allCategoriesHref: buildHref(BY_CATEGORY_PATH, month),
  };
}

/** Connects the Visão geral to its data (month summary, timeline, curve, categories) and hands the View ready props. */
export function OverviewViewModel() {
  return <OverviewView {...useOverviewModel()} />;
}
