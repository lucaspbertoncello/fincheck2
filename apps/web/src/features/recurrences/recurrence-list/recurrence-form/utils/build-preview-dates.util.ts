import { buildShiftNote } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-shift-note.util.ts';
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

/** The day of the rule in a month as the person wrote it, held at the last day of a short month. */
function writtenDayOn(month: string, day: string): string | null {
  const number = Number(day);
  if (!Number.isInteger(number) || number < 1) return null;
  const [year = 0, monthNumber = 1] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return `${month}-${String(Math.min(number, lastDay)).padStart(2, '0')}`;
}

/**
 * The first three dates of the preview, with the weekday and, when the rule has a margin, the
 * window. `day` is the day typed in "Dia fixo": when the shown date is not that day, the rule moved
 * it off a weekend or a holiday and the note says what it was ("era domingo") instead of the margin.
 */
export function buildPreviewDates(
  occurrences: readonly PreviewOccurrence[],
  ruleType: RecurrenceFormValues['ruleType'],
  day = '',
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
    const written = ruleType === 'fixed_day' ? writtenDayOn(item.month, day) : null;
    const shiftNote = written && written !== item.expectedOn ? buildShiftNote(written) : null;
    const margin = showsWindow
      ? describeMargin(item.expectedOn, item.windowStartOn, item.windowEndOn)
      : null;
    const note = shiftNote ?? margin;
    const window = margin
      ? `, pode chegar de ${dayLong.format(toDate(item.windowStartOn))} a ${dayLong.format(toDate(item.windowEndOn))}`
      : '';

    return {
      key: item.expectedOn,
      weekday: clean(weekdayShort.format(date)),
      dayMonth: `${date.getUTCDate()} ${clean(monthShort.format(date))}`,
      note,
      label: `${fullDate.format(date)}${shiftNote ? `, ${shiftNote}` : ''}${window}`,
    };
  });
}
