import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

// The category with the biggest spending in the window, and its share of everything spent (every
// line, categorized or not). Refunds come off their category; one that ends at zero or below does
// not compete; a tie goes to the smaller id.
export function findTopCategory(window: SpendWindow): Profile.Highlights['topCategory'] {
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const line of window.lines) {
    total += line.spentCents;
    if (line.categoryId)
      byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) + line.spentCents);
  }

  if (total <= 0) return null;
  const [top] = [...byCategory.entries()]
    .filter(([, cents]) => cents > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!top) return null;

  return {
    categoryId: top[0],
    totalCents: top[1],
    sharePercent: Math.min(100, Math.round((top[1] * 1000) / total) / 10),
  };
}
