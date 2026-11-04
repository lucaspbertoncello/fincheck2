import type { PreviewDate } from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-date.type.ts';

type PreviewOccurrence = {
  month: string;
  expectedOn: string | null;
  windowStartOn: string;
  windowEndOn: string;
};

const MAX_DATES = 3;

const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const clean = (text: string) => text.replace(/\./g, '');

function toDate(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "18 a 22 nov", or "30 nov a 3 dez" when the window crosses the month; null when it is one day. */
function describeWindow(startOn: string, endOn: string): string | null {
  if (startOn === endOn) return null;
  const start = toDate(startOn);
  const end = toDate(endOn);
  const sameMonth = startOn.slice(0, 7) === endOn.slice(0, 7);

  return sameMonth
    ? `${start.getUTCDate()} a ${end.getUTCDate()} ${clean(monthShort.format(end))}`
    : `${start.getUTCDate()} ${clean(monthShort.format(start))} a ${end.getUTCDate()} ${clean(monthShort.format(end))}`;
}

/** The first three dates of the preview, with the weekday and, when it has one, the window. */
export function buildPreviewDates(occurrences: readonly PreviewOccurrence[]): PreviewDate[] {
  return occurrences.slice(0, MAX_DATES).map((item) => {
    if (!item.expectedOn) {
      const month = toDate(`${item.month}-01`);
      return {
        key: item.month,
        weekday: '',
        dayMonth: monthLong.format(month).replace(/^./, (letter) => letter.toUpperCase()),
        note: 'qualquer dia',
        label: `qualquer dia de ${monthLong.format(month)}`,
      };
    }

    const date = toDate(item.expectedOn);
    const note = describeWindow(item.windowStartOn, item.windowEndOn);
    const window = note
      ? `, pode chegar de ${dayLong.format(toDate(item.windowStartOn))} a ${dayLong.format(toDate(item.windowEndOn))}`
      : '';

    return {
      key: item.expectedOn,
      weekday: clean(weekdayShort.format(date)),
      dayMonth: `${date.getUTCDate()} ${clean(monthShort.format(date))}`,
      note,
      label: `${fullDate.format(date)}${window}`,
    };
  });
}
