import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';
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

/**
 * The window is the days the app looks for the payment in. It is only worth showing where it is a
 * margin around the day ("Dia fixo" and "Perto do dia"): for "Dia útil" it starts on the 1st and
 * for "Qualquer dia" it is the whole month, which would only read as noise next to the date.
 */
const RULES_WITH_MARGIN: readonly RecurrenceFormValues['ruleType'][] = ['fixed_day', 'around_day'];

/** "± 3 dias": the margin around the day the app looks for the payment in; null when it is not symmetric. */
function describeMargin(expectedOn: string, startOn: string, endOn: string): string | null {
  const day = 86_400_000;
  const before = Math.round((toDate(expectedOn).getTime() - toDate(startOn).getTime()) / day);
  const after = Math.round((toDate(endOn).getTime() - toDate(expectedOn).getTime()) / day);
  if (before !== after || before === 0) return null;
  return `± ${before} ${before === 1 ? 'dia' : 'dias'}`;
}

/** The first three dates of the preview, with the weekday and, when the rule has a margin, the window. */
export function buildPreviewDates(
  occurrences: readonly PreviewOccurrence[],
  ruleType: RecurrenceFormValues['ruleType'],
): PreviewDate[] {
  const showsWindow = RULES_WITH_MARGIN.includes(ruleType);
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
    const note = showsWindow
      ? describeMargin(item.expectedOn, item.windowStartOn, item.windowEndOn)
      : null;
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
