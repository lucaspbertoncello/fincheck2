/**
 * Sets one part and, in a two-part split, gives the other part the rest so the sum keeps matching.
 * With three or more parts only the edited one changes. The amount is kept between 0 and the total.
 */
export function balanceSplitParts(
  totalCents: number,
  partsCents: readonly number[],
  index: number,
  amountCents: number,
): number[] {
  const clamped = Math.min(Math.max(Math.trunc(amountCents), 0), Math.max(totalCents, 0));
  const next = partsCents.map((amount, position) => (position === index ? clamped : amount));

  if (next.length === 2) {
    const other = index === 0 ? 1 : 0;
    next[other] = totalCents - clamped;
  }
  return next;
}
