const MONTH_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** "Março de 2026" from a month (`YYYY-MM`). */
export function formatHighlightMonth(month: string): string {
  return `${MONTH_LONG[Number(month.slice(5, 7)) - 1] ?? ''} de ${month.slice(0, 4)}`;
}
