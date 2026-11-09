// `numerator` as a percentage of `denominator`, with one decimal, the half going away from zero
// (9.95 is 10.0). Integer arithmetic on the cents, so no float error creeps in; null when the
// denominator is not positive (there is nothing to compare with).
export function roundPct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;

  const tenths = Math.floor((2 * Math.abs(numerator) * 1000 + denominator) / (2 * denominator));

  // A negative change that rounds to zero is 0, not -0.
  return numerator < 0 && tenths > 0 ? -tenths / 10 : tenths / 10;
}
