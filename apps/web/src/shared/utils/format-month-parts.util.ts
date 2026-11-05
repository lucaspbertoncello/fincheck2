import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

const monthNameFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

/** `2026-10` -> `{ monthLabel: "Outubro", yearLabel: "2026" }`. */
export function formatMonthParts(monthKey: string): { monthLabel: string; yearLabel: string } {
  const [year = 0, month = 1] = monthKey.split('-').map(Number);
  const name = monthNameFormat.format(new Date(Date.UTC(year, month - 1, 1)));
  return { monthLabel: capitalize(name), yearLabel: String(year) };
}
