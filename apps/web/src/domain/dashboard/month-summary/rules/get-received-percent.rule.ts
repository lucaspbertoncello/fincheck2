/** Share of the expected income already received, rounded to a whole percent. No expected income gives 0. */
export function getReceivedPercent(receivedCents: number, expectedCents: number): number {
  return expectedCents > 0 ? Math.round((receivedCents / expectedCents) * 100) : 0;
}
