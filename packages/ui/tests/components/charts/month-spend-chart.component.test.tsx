import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { formatAxisCents } from '#/components/charts/format-axis-cents.util.ts';
import { maxOfRows } from '#/components/charts/max-of-rows.util.ts';
import { monthSpendXTicks } from '#/components/charts/month-spend-x-ticks.util.ts';
import { niceYAxis } from '#/components/charts/nice-y-axis.util.ts';
import { buildMonthSpendRows } from '#/components/charts/month-spend-series.util.ts';
import { MonthSpendTooltipCard } from '#/components/charts/month-spend-tooltip.component.tsx';
import { MonthSpendChart } from '#/components/charts/index.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const current = [
  { day: 1, cents: 5000 },
  { day: 3, cents: 120000 },
  { day: 4, cents: 150000 },
];
const previous = [
  { day: 1, cents: 8000 },
  { day: 5, cents: 200000 },
];

function render(hidden = false) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <MonthSpendChart
        currentLabel="Outubro"
        previousLabel="Setembro"
        current={current}
        previous={previous}
        today={4}
        daysInMonth={6}
      />
    </MoneyVisibilityContext>,
  );
}

describe('buildMonthSpendRows', () => {
  const rows = buildMonthSpendRows({ current, previous, today: 4, daysInMonth: 6 });

  it('makes one row per day of the month', () => {
    expect(rows.map((row) => row.day)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('carries the last value forward on days without a point', () => {
    expect(rows[1]).toMatchObject({ current: 5000, previous: 8000 });
    expect(rows[4]?.previous).toBe(200000);
  });

  it('stops the current month after today but not the previous one', () => {
    expect(rows[3]?.current).toBe(150000);
    expect(rows[4]?.current).toBeNull();
    expect(rows[5]?.previous).toBe(200000);
  });

  it('does not depend on the order of the points', () => {
    const shuffled = buildMonthSpendRows({
      current: [...current].reverse(),
      previous: [...previous].reverse(),
      today: 4,
      daysInMonth: 6,
    });
    expect(shuffled).toEqual(rows);
  });
});

describe('axis helpers', () => {
  it('puts the X ticks on 1, 8, 15, 22 and the last day', () => {
    expect(monthSpendXTicks(31)).toEqual([1, 8, 15, 22, 31]);
    expect(monthSpendXTicks(22)).toEqual([1, 8, 15, 22]);
  });

  it('builds round Y ticks that cover the maximum', () => {
    const axis = niceYAxis(480000);
    expect(axis.top).toBeGreaterThanOrEqual(480000);
    expect(axis.ticks).toEqual([0, 100000, 200000, 300000, 400000, 500000]);
  });

  it('survives an empty month', () => {
    expect(niceYAxis(0).ticks.length).toBeGreaterThan(1);
  });

  it('writes axis labels in reais with "mil"', () => {
    expect(formatAxisCents(0)).toBe('0');
    expect(formatAxisCents(50000)).toBe('500');
    expect(formatAxisCents(150000)).toBe('1,5 mil');
    expect(formatAxisCents(500000)).toBe('5 mil');
  });

  it('finds the maximum over both series', () => {
    const rows = buildMonthSpendRows({ current, previous, today: 4, daysInMonth: 6 });
    expect(maxOfRows(rows)).toBe(200000);
  });
});

describe('MonthSpendChart', () => {
  it('names both series in the legend and the title', () => {
    const html = render();
    expect(html).toContain('Gasto do mês');
    expect(html).toContain('Outubro');
    expect(html).toContain('Setembro');
  });

  it('hides the plot from assistive tech and offers a table with the values in BRL', () => {
    const html = render();
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<table');
    expect(html).toContain('R$ 1.500,00');
    expect(html).toContain('R$ 2.000,00');
    expect(html).toContain('sem dado');
  });

  it('says so, and draws no current line, when the month has no spending yet', () => {
    const html = renderToStaticMarkup(
      <MonthSpendChart
        currentLabel="Outubro"
        previousLabel="Setembro"
        current={[]}
        previous={previous}
        today={4}
        daysInMonth={6}
      />,
    );
    expect(html).toContain('Sem gasto em Outubro ainda');
    expect(html).not.toContain('Sem gasto em Setembro');
  });

  it('never leaks the numbers in the table when the values are hidden', () => {
    const html = render(true);
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('1.500,00');
    expect(html).not.toContain('2.000,00');
  });
});

describe('MonthSpendTooltipCard', () => {
  const row = { day: 4, current: 150000, previous: 8000 };

  it('shows the day and both values in text', () => {
    const html = renderToStaticMarkup(
      <MonthSpendTooltipCard
        row={row}
        currentLabel="Outubro"
        previousLabel="Setembro"
        hidden={false}
      />,
    );
    expect(html).toContain('Dia 4');
    expect(html).toContain('Outubro');
    expect(html).toContain('R$ 1.500,00');
    expect(html).toContain('R$ 80,00');
  });

  it('shows dots instead of values when hidden', () => {
    const html = renderToStaticMarkup(
      <MonthSpendTooltipCard row={row} currentLabel="Outubro" previousLabel="Setembro" hidden />,
    );
    // The digits become dots and the shape stays, so the tooltip keeps its size.
    expect(html).toContain('R$ •.•••,••');
    expect(html).not.toContain('1.500,00');
  });

  it('leaves the current month out after today', () => {
    const html = renderToStaticMarkup(
      <MonthSpendTooltipCard
        row={{ day: 6, current: null, previous: 8000 }}
        currentLabel="Outubro"
        previousLabel="Setembro"
        hidden={false}
      />,
    );
    expect(html).not.toContain('Outubro');
    expect(html).toContain('Setembro');
  });
});
