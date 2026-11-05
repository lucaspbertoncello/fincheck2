import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { SpendWindow } from '#mocks/profile/highlights/spend-window.type.ts';

// The category with the biggest spending in the window, and its share of everything spent.
export function findTopCategory(window: SpendWindow): Profile.Highlights['topCategory'] {
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const line of window.lines) {
    total += line.spentCents;
    if (line.categoryId)
      byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) + line.spentCents);
  }

  const [top] = [...byCategory.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!top || top[1] <= 0 || total <= 0) return null;

  return {
    categoryId: top[0],
    totalCents: top[1],
    sharePercent: Math.min(100, Math.round((top[1] / total) * 1000) / 10),
  };
}
