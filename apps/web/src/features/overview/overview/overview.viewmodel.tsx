import { useState } from 'react';

import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCategoryBreakdown } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown.hook.ts';
import { useMonthSummary } from '#/domain/dashboard/month-summary/hooks/use-month-summary.hook.ts';
import { useSpendingCurve } from '#/domain/dashboard/spending-curve/hooks/use-spending-curve.hook.ts';
import { useTimeline } from '#/domain/dashboard/timeline/hooks/use-timeline.hook.ts';
import type { OverviewModel } from '#/features/overview/overview/overview.model.ts';
import { OverviewView } from '#/features/overview/overview/overview.view.tsx';
import { buildAlerts } from '#/features/overview/overview/utils/build-alerts.util.ts';
import { buildCategories } from '#/features/overview/overview/utils/build-categories.util.tsx';
import { buildRemainingLine } from '#/features/overview/overview/utils/build-remaining-line.util.ts';
import { buildSpend } from '#/features/overview/overview/utils/build-spend.util.ts';
import {
  buildStrip,
  pickDefaultDate,
} from '#/features/overview/overview/utils/build-strip.util.ts';
import { buildSummaryCards } from '#/features/overview/overview/utils/build-summary-cards.util.ts';
import { toSectionState } from '#/features/overview/overview/utils/to-section-state.util.ts';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { formatPageDate } from '#/shared/utils/format-page-date.util.ts';
import { getTimeOfDayIcon } from '#/shared/utils/get-time-of-day-icon.util.ts';

/** Where "Ver todas" lands: Transações in its "Por categoria" view (the `view` param belongs to that screen). */
const BY_CATEGORY_PATH = '/transactions?view=category';

function useOverviewModel(): OverviewModel {
  const now = new Date();
  const isDesktop = useIsDesktop();
  const { month, monthLabel, yearLabel, goToPrevious, goToNext } = useSelectedMonth();
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
    monthLabel,
    yearLabel,
    dateIcon: getTimeOfDayIcon(now),
    dateText: formatPageDate(now),
    onPreviousMonth: goToPrevious,
    onNextMonth: goToNext,
    showsPanelInline: !isDesktop,
    isDesktop,
    remaining: {
      // Loading keeps the line's skeleton; a loaded month without `remaining` has no line.
      isVisible: monthSummary.isPending || (monthSummary.data?.remaining ?? null) !== null,
      data: monthSummary.data ? buildRemainingLine(monthSummary.data) : undefined,
    },
    alerts: monthSummary.data
      ? buildAlerts(monthSummary.data.alerts, {
          settings: buildHref('/settings', month),
          recurrences: buildHref('/recurrences', month),
        })
      : [],
    summary: toSectionState(monthSummary, (data) =>
      buildSummaryCards(month, data, curve.data, breakdown.data),
    ),
    strip,
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
    allCategoriesHref: `${BY_CATEGORY_PATH}&month=${month}`,
  };
}

/** Connects the Visão geral to its data (month summary, timeline, curve, categories) and hands the View ready props. */
export function OverviewViewModel() {
  return <OverviewView {...useOverviewModel()} />;
}
