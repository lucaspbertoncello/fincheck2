// A business date as an instant at 15:00 UTC (noon in São Paulo), for `createdAt`-style fields.
export function toInstant(date: string): string {
  return `${date}T15:00:00.000Z`;
}
