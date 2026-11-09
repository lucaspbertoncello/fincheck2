// Integer cents of an amount in reais, keeping its sign. Goes through `toFixed(2)` first because
// `0.29 * 100` is 28.999999999999996 and `Math.round` alone does not save every case.
export function convertAmountToCents(amount: unknown): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new TypeError('The amount is not a number');
  }
  const cents = Math.round(Number(Math.abs(amount).toFixed(2)) * 100);

  return amount < 0 && cents > 0 ? -cents : cents;
}
