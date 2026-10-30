// Splits `totalCents` into `parts` integer amounts that add up to the total. The first part takes
// the leftover cents (R$ 1.299,00 in 12 is 12 x 108,25; R$ 100,00 in 3 is 33,34 + 33,33 + 33,33).
// Same rule as `Money.allocate` in the API, so the preview in the form matches what is saved.
export function allocateCents(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(totalCents)) throw new RangeError('totalCents must be an integer');
  if (!Number.isInteger(parts) || parts < 1) throw new RangeError('parts must be an integer >= 1');

  const base = Math.trunc(totalCents / parts);
  const leftover = totalCents - base * parts;

  return Array.from({ length: parts }, (_, index) => (index === 0 ? base + leftover : base));
}
