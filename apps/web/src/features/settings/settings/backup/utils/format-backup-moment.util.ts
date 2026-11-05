import { formatBackupDay } from '#/features/settings/settings/backup/utils/format-backup-day.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
});

const DAY_MS = 86_400_000;

/** "hoje às 03:00", "ontem às 03:00", "amanhã às 03:00" or "21/10 às 03:00". */
export function formatBackupMoment(instant: string, now: Date): string {
  const date = new Date(instant);
  const key = getBusinessDate(date);
  const time = timeFormat.format(date);

  if (key === getBusinessDate(now)) return `hoje às ${time}`;
  if (key === getBusinessDate(new Date(now.getTime() - DAY_MS))) return `ontem às ${time}`;
  if (key === getBusinessDate(new Date(now.getTime() + DAY_MS))) return `amanhã às ${time}`;

  return `${formatBackupDay(instant)} às ${time}`;
}
