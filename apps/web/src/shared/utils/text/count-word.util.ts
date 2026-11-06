/** "1 transação", "3 transações": the count with the noun that agrees with it. */
export function countWord(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
