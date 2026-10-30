/** "1 transação", "2 transações": the noun agrees with the count (Portuguese plural). */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
