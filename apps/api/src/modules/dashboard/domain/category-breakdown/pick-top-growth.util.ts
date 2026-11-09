import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

// A category needs at least this much spent in the period before (R$ 20,00) to be "where it grew
// the most": it avoids a "+900%" of a category that was almost empty (decided by the PM, Q16).
const MIN_PREVIOUS_CENTS = 2000;

// "Onde mais cresceu" (BR-DSH-006): the category, among the ones that have one, with the biggest
// rise in reais, from the ones that spent at least R$ 20,00 in the period before and rose at least
// 10% (10 per cent of the period before is the least: `change x 10 >= previous`, in whole cents,
// not on the rounded percentage). Null when none rose, or when there is no period before.
export function pickTopGrowth(
  items: CategoryBreakdown.ExpenseItem[],
): NonNullable<CategoryBreakdown.Dto['expenses']['topGrowth']> | null {
  let best: CategoryBreakdown.ExpenseItem | null = null;

  for (const item of items) {
    if (item.categoryId === null) continue;
    const previous = item.previousSpentCents;
    const change = item.changeCents;
    if (previous === null || change === null) continue;
    if (previous < MIN_PREVIOUS_CENTS || change <= 0 || change * 10 < previous) continue;
    if (best === null || change > (best.changeCents ?? 0)) best = item;
  }

  return best
    ? { categoryId: best.categoryId, changePct: best.changePct, changeCents: best.changeCents ?? 0 }
    : null;
}
