import type { PreviewTile } from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-tile.type.ts';

type PreviewOccurrence = { month: string; expectedOn: string | null };

const MAX_TILES = 3;

const weekdayShort = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
const monthLong = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const clean = (text: string) => text.replace(/\./g, '');

/** The first three dates of the preview, as tiles of the trail ("sex 20 nov"). */
export function buildPreviewTiles(occurrences: readonly PreviewOccurrence[]): PreviewTile[] {
  return occurrences.slice(0, MAX_TILES).map((item) => {
    const [year = 0, monthNumber = 1, day = 1] = (item.expectedOn ?? `${item.month}-01`)
      .split('-')
      .map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1, day));

    if (!item.expectedOn) {
      return {
        key: item.month,
        weekday: '',
        day: '…',
        month: clean(monthShort.format(date)),
        label: `qualquer dia de ${monthLong.format(date)}`,
      };
    }

    return {
      key: item.expectedOn,
      weekday: clean(weekdayShort.format(date)),
      day: String(day),
      month: clean(monthShort.format(date)),
      label: fullDate.format(date),
    };
  });
}
