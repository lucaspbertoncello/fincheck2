import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildHeatmapGrid } from '#/components/heatmap/build-heatmap-grid.util.ts';
import { describeHeatmapDay } from '#/components/heatmap/describe-heatmap-day.util.ts';
import { moveHeatmapFocus } from '#/components/heatmap/move-heatmap-focus.util.ts';
import {
  SpendHeatmap,
  SpendHeatmapLegend,
  type SpendHeatmapDay,
} from '#/components/heatmap/index.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

/** Every day from `from` to `to` (UTC, inclusive); the level follows the day of the month. */
function makeDays(from: string, to: string): SpendHeatmapDay[] {
  const days: SpendHeatmapDay[] = [];
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let time = new Date(`${from}T00:00:00Z`).getTime(); time <= end; time += 86_400_000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const dayOfMonth = Number(date.slice(8, 10));
    const level = dayOfMonth % 5;
    days.push({ date, level, totalCents: level === 0 ? 0 : level * 12345 });
  }
  return days;
}

// 2026-10-28 is a Wednesday: the first week is partial, and the 1st of November is a Sunday.
const DAYS = makeDays('2026-10-28', '2026-11-10');

describe('buildHeatmapGrid', () => {
  it('puts Sunday on top, starts a column every Sunday and leaves the corners empty', () => {
    const { weeks } = buildHeatmapGrid(DAYS);

    expect(weeks).toHaveLength(3);
    expect(weeks[0]?.map((day) => day?.date ?? null)).toEqual([
      null,
      null,
      null,
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ]);
    expect(weeks[1]?.[0]?.date).toBe('2026-11-01');
    expect(weeks[2]?.[2]?.date).toBe('2026-11-10');
    expect(weeks[2]?.[3]).toBeNull();
  });

  it('labels the month over the column of its 1st, except in the last column', () => {
    const labels = buildHeatmapGrid(makeDays('2026-01-01', '2026-03-01')).monthLabels;

    expect(labels.map((label) => label.label)).toEqual(['jan', 'fev']);
    expect(buildHeatmapGrid(DAYS).monthLabels).toEqual([{ column: 1, label: 'nov' }]);
  });
});

describe('describeHeatmapDay', () => {
  it('says the value first, then the date', () => {
    expect(describeHeatmapDay('2026-03-12', 24590, false)).toBe(
      'R$ 245,90, quinta-feira, 12 de março',
    );
  });

  it('says there was no spending', () => {
    expect(describeHeatmapDay('2026-03-12', 0, false)).toBe(
      'Sem gastos, quinta-feira, 12 de março',
    );
  });

  it('keeps the shape and drops the digits when values are hidden', () => {
    expect(describeHeatmapDay('2026-03-12', 24590, true)).toBe(
      'R$ •••,••, quinta-feira, 12 de março',
    );
  });
});

describe('moveHeatmapFocus', () => {
  const { weeks } = buildHeatmapGrid(DAYS);

  it('moves a day with the arrows and stays inside the map', () => {
    expect(moveHeatmapFocus(weeks, { column: 1, row: 2 }, 'ArrowRight')).toEqual({
      column: 2,
      row: 2,
    });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 2 }, 'ArrowDown')).toEqual({
      column: 1,
      row: 3,
    });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 6 }, 'ArrowDown')).toEqual({
      column: 1,
      row: 6,
    });
    expect(moveHeatmapFocus(weeks, { column: 0, row: 3 }, 'ArrowLeft')).toEqual({
      column: 0,
      row: 3,
    });
  });

  it('goes to the ends of the row with Home and End, and of the column with Page Up and Down', () => {
    expect(moveHeatmapFocus(weeks, { column: 1, row: 4 }, 'Home')).toEqual({ column: 0, row: 4 });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 1 }, 'End')).toEqual({ column: 2, row: 1 });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 4 }, 'PageUp')).toEqual({ column: 1, row: 0 });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 4 }, 'PageDown')).toEqual({
      column: 1,
      row: 6,
    });
  });

  it('never lands on an empty corner', () => {
    // Column 0 has no Sunday to Tuesday: Page Up from Wednesday stays on the first real day.
    expect(moveHeatmapFocus(weeks, { column: 0, row: 4 }, 'PageUp')).toEqual({ column: 0, row: 3 });
    // Home on Sunday of the last week goes to the first Sunday the map has.
    expect(moveHeatmapFocus(weeks, { column: 2, row: 0 }, 'Home')).toEqual({ column: 1, row: 0 });
    expect(moveHeatmapFocus(weeks, { column: 1, row: 0 }, 'Other')).toEqual({ column: 1, row: 0 });
  });
});

function render(hidden = false) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <SpendHeatmap days={DAYS} label="Gasto por dia" onSelectDay={() => undefined} />
    </MoneyVisibilityContext>,
  );
}

describe('SpendHeatmap', () => {
  it('is a grid of one named button per day, with a single tab stop on the last day', () => {
    const html = render();

    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="Gasto por dia"');
    expect(html.match(/<button/g)).toHaveLength(DAYS.length);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="R$ 370,35, domingo, 8 de novembro"');
  });

  it('does not leak amounts when the values are hidden', () => {
    const html = render(true);

    expect(html).toContain('R$ •••,••');
    expect(html).not.toContain('370,35');
  });

  it('writes the scale in words', () => {
    const html = renderToStaticMarkup(<SpendHeatmapLegend />);

    expect(html).toContain('Menos');
    expect(html).toContain('Mais');
  });
});
