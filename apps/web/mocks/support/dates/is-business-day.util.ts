// Monday to Friday. The mock has no holiday calendar (the real API has one).
export function isBusinessDay(date: string): boolean {
  const weekday = new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))),
  ).getUTCDay();

  return weekday !== 0 && weekday !== 6;
}
