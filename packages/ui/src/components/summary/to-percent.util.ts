/** `part` as a percent of `whole`, kept between 0 and 100. A whole of zero or less gives 0. */
export function toPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
