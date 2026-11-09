import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { VariationBadge, type DonutSlice } from '@fincheck/ui';

import type { CategoriesData } from '#/features/overview/overview/overview.model.ts';
import { monthName } from '#/features/overview/overview/utils/month-name.util.ts';
import { monthShortName } from '#/features/overview/overview/utils/month-short-name.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

/** The donut paints four categories; the rest folds into "Outros" (contract: the grouping is the front's). */
const DONUT_CATEGORY_LIMIT = 4;

const NO_CATEGORY = 'Sem categoria';

function changePercent(spentCents: number, previousCents: number): number | null {
  if (previousCents <= 0) return null;
  return Math.round(((spentCents - previousCents) / previousCents) * 1000) / 10;
}

function badgeFor(percent: number | null) {
  return percent === null ? undefined : <VariationBadge percent={percent} badTone="caution" />;
}

function nameOf(categoryId: string | null, categories: readonly Category.Dto[]): string {
  if (categoryId === null) return NO_CATEGORY;
  return categories.find((category) => category.id === categoryId)?.name ?? NO_CATEGORY;
}

function buildSlices(
  items: readonly CategoryBreakdown.ExpenseItem[],
  categories: readonly Category.Dto[],
): DonutSlice[] {
  const kept = items.slice(0, DONUT_CATEGORY_LIMIT).map((item) => ({
    id: item.categoryId ?? 'uncategorized',
    name: nameOf(item.categoryId, categories),
    cents: item.spentCents,
    badge: badgeFor(item.changePct),
  }));
  const folded = items.slice(DONUT_CATEGORY_LIMIT);
  if (folded.length === 0) return kept;

  const spent = folded.reduce((sum, item) => sum + item.spentCents, 0);
  const previous = folded.reduce((sum, item) => sum + (item.previousSpentCents ?? 0), 0);
  return [
    ...kept,
    {
      id: 'other',
      name: 'Outros',
      cents: spent,
      isOther: true,
      badge: badgeFor(changePercent(spent, previous)),
    },
  ];
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}

/** Donut, center, "onde mais cresceu" card and the collapsed line of the phone, from the breakdown. */
export function buildCategories(
  month: string,
  breakdown: CategoryBreakdown.Dto,
  categories: readonly Category.Dto[],
): CategoriesData {
  const { topGrowth } = breakdown.expenses;
  // A category whose refund was bigger than its spending comes with a spent of zero or below: it
  // is not a slice (the donut cannot draw it) and does not lead.
  const items = breakdown.expenses.items.filter((item) => item.spentCents > 0);
  const growthSource = breakdown.expenses.items;
  const previousKey = shiftMonthKey(month, -1);
  const growthItem = topGrowth
    ? growthSource.find((item) => item.categoryId === topGrowth.categoryId)
    : undefined;
  const growthName = topGrowth ? nameOf(topGrowth.categoryId, categories) : undefined;
  const leader = items[0];

  const centerTitle = growthName ?? (leader ? nameOf(leader.categoryId, categories) : 'Sem gasto');
  const centerDetail =
    topGrowth && topGrowth.changePct !== null
      ? `${formatPercent(topGrowth.changePct)} que ${monthShortName(previousKey)}`
      : leader && leader.sharePct !== null
        ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(leader.sharePct)}% do gasto`
        : undefined;

  return {
    slices: buildSlices(items, categories),
    centerTitle,
    centerDetail,
    insight:
      topGrowth && growthName
        ? {
            categoryName: growthName,
            changeCents: topGrowth.changeCents,
            changePct: topGrowth.changePct,
            transactionCount: growthItem?.transactionCount ?? 0,
            previousMonthLabel: monthName(previousKey),
          }
        : undefined,
    collapsedSummary:
      topGrowth && growthName && topGrowth.changePct !== null
        ? `${growthName} cresceu ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(topGrowth.changePct)}%`
        : undefined,
    hasSpending: items.length > 0,
  };
}
