import { capitalize } from '#/shared/utils/text/capitalize.util.ts';

const pageDateFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "Quinta-feira, 22 de outubro": the weekday in full, capitalized, as under every page title. */
export function formatPageDate(now: Date): string {
  const text = pageDateFormat.format(now);
  return capitalize(text);
}
