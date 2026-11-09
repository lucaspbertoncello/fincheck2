import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';

// The category with the biggest spending (BR-PRF-005) and its share of all the spending of the
// period, with one decimal. The base is every spending line, categorized or not, so the share is
// of what he really spent. Refunds come off their category; a category that ends at zero or below
// does not compete. Ties go to the smaller id, to stay stable. `null` without spending. Pure.
export function computeTopCategory(
  lines: ProfileSpendingReader.Line[],
): Profile.Highlights['topCategory'] {
  const byCategory = new Map<string, number>();
  let base = 0;

  for (const line of lines) {
    base += line.cents;
    if (line.categoryId === null) continue;
    byCategory.set(line.categoryId, (byCategory.get(line.categoryId) ?? 0) + line.cents);
  }
  if (base <= 0) return null;

  const [best] = [...byCategory.entries()]
    .filter(([, cents]) => cents > 0)
    .toSorted(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB));
  if (!best) return null;

  const [categoryId, totalCents] = best;

  return {
    categoryId,
    totalCents,
    sharePercent: Math.min(100, Math.round((totalCents * 1000) / base) / 10),
  };
}
