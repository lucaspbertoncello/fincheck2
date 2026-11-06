/**
 * How much more (positive) or less (negative) was spent than in the previous month at the same
 * point, in percent. Null when the previous month had nothing to compare with.
 */
export function getSpentVariationPercent(
  spentCents: number,
  previousSamePointCents: number,
): number | null {
  if (previousSamePointCents <= 0) return null;
  return ((spentCents - previousSamePointCents) / previousSamePointCents) * 100;
}
