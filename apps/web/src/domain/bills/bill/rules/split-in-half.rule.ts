/** Half of an amount in cents, rounded to the nearest cent (half a cent goes up). */
export function splitInHalf(cents: number): number {
  return Math.round(cents / 2);
}
