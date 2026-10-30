/** Sum of amounts in integer cents. */
export function sumCents(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
