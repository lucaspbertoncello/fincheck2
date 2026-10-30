/**
 * "Pega mais 3 transações do histórico": the preview counts the one under review too, and the
 * sentence says "mais", so it comes out.
 */
export function countRuleCatches(willChangeCount: number): number {
  return Math.max(0, willChangeCount - 1);
}
