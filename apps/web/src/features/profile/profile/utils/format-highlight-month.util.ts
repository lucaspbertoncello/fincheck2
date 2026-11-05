import { MONTH_NAMES } from '#/shared/constants/date/month-names.constant.ts';
import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

/** "Março de 2026" from a month (`YYYY-MM`). */
export function formatHighlightMonth(month: string): string {
  return `${capitalize(MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? '')} de ${month.slice(0, 4)}`;
}
