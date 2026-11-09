// The day in America/Sao_Paulo of an instant (an ISO 8601 text). It differs from the UTC day at
// night: 23:30 in São Paulo is already the next day in UTC.
export function businessDateOfInstant(instant: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(Date.parse(instant));
}
