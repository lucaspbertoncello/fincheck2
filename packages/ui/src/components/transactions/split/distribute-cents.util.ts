/**
 * Splits a total into `count` parts that add up to the total, to the cent: the leftover cents go
 * one each to the first parts (10000 in 3 -> 3334, 3333, 3333). Invalid input gives no parts.
 */
export function distributeCents(totalCents: number, count: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) return [];
  if (!Number.isInteger(count) || count < 1) return [];

  const base = Math.floor(totalCents / count);
  const leftover = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < leftover ? 1 : 0));
}
