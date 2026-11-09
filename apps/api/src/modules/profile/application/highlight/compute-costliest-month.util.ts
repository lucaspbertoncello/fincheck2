import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import type { ProfileSpendingReader } from '#/modules/profile/application/highlight/profile-spending-reader.interface.ts';

// The month with the biggest spending (BR-PRF-005). A tie goes to the most recent month. `null`
// when no month ends above zero. Pure.
export function computeCostliestMonth(
  lines: ProfileSpendingReader.Line[],
): Profile.Highlights['costliestMonth'] {
  const byMonth = new Map<string, number>();
  for (const line of lines) {
    const month = line.on.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + line.cents);
  }

  const [best] = [...byMonth.entries()]
    .filter(([, cents]) => cents > 0)
    .toSorted(([monthA, a], [monthB, b]) => b - a || monthB.localeCompare(monthA));

  return best ? { month: best[0], totalCents: best[1] } : null;
}
