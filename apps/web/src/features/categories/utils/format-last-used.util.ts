import { MONTH_ABBREVIATIONS } from '#/shared/constants/date/month-names.constant.ts';
import { daysBetween } from '#/shared/utils/date/days-between.util.ts';

const RECENT_DAYS = 31;

/**
 * Last use of a category as the list shows it: "hoje", "ontem", "3 out.", and past a month the
 * distance too ("28 ago., há 2 meses"). A category never used has a dash.
 */
export function formatLastUsed(lastUsedOn: string | null, today: string): string {
  if (!lastUsedOn) return '—';

  const days = daysBetween(lastUsedOn, today);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';

  const day = Number(lastUsedOn.slice(8, 10));
  const month = MONTH_ABBREVIATIONS[Number(lastUsedOn.slice(5, 7)) - 1] ?? '';
  const year = lastUsedOn.slice(0, 4);
  const sameYear = year === today.slice(0, 4);
  const date = sameYear ? `${day} ${month}` : `${day} ${month} ${year}`;
  if (days <= RECENT_DAYS) return date;

  const months = Math.floor(days / 30);
  return `${date}, há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}
