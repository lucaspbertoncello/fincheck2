import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MonthBarsChart } from '#/components/charts/index.ts';
import { MonthBarsTooltipCard } from '#/components/charts/month-bars-tooltip.component.tsx';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const bars = [
  {
    key: '2026-08',
    label: 'ago',
    fullLabel: 'agosto de 2026',
    cents: 12000,
    detail: '2 transações',
  },
  { key: '2026-09', label: 'set', fullLabel: 'setembro de 2026', cents: 0, detail: '0 transações' },
  {
    key: '2026-10',
    label: 'out',
    fullLabel: 'outubro de 2026',
    cents: 30050,
    detail: '5 transações',
  },
];

function render(props: Partial<Parameters<typeof MonthBarsChart>[0]> = {}, hidden = false) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <MonthBarsChart
        title="Gasto por mês em Mercado"
        valueLabel="Gasto"
        bars={bars}
        highlightKey="2026-10"
        {...props}
      />
    </MoneyVisibilityContext>,
  );
}

describe('MonthBarsChart', () => {
  it('is a named region with the plot hidden from assistive tech', () => {
    const html = render();

    expect(html).toContain('aria-label="Gasto por mês em Mercado"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('has a table twin with one row per month and the highlighted month in the caption', () => {
    const html = render();

    expect(html).toContain('Gasto por mês em Mercado, outubro de 2026 em destaque');
    expect(html).toContain('agosto de 2026');
    expect(html).toContain('R$ 300,50');
    expect(html).toContain('5 transações');
    expect(html.match(/<tr>/g)).toHaveLength(bars.length + 1);
  });

  it('leaves the caption plain when no bar is highlighted', () => {
    expect(render({ highlightKey: null })).not.toContain('em destaque');
  });

  it('never leaks the amounts in the table when the values are hidden', () => {
    const html = render({}, true);

    expect(html).not.toContain('300,50');
    expect(html).toContain('valor oculto');
  });

  it('says why the plot is empty when every bar is zero', () => {
    const html = render({
      bars: bars.map((bar) => ({ ...bar, cents: 0 })),
      highlightKey: null,
      emptyMessage: 'Sem gasto nos últimos 12 meses',
    });

    expect(html).toContain('Sem gasto nos últimos 12 meses');
  });
});

describe('MonthBarsTooltipCard', () => {
  const [first] = bars;

  it('names the month, the measure with its value and the detail', () => {
    const html = renderToStaticMarkup(
      <MonthBarsTooltipCard bar={first!} valueLabel="Gasto" hidden={false} />,
    );

    expect(html).toContain('agosto de 2026');
    expect(html).toContain('Gasto');
    expect(html).toContain('R$ 120,00');
    expect(html).toContain('2 transações');
    expect(html).toContain('tabular-nums');
  });

  it('masks the value when hidden', () => {
    const html = renderToStaticMarkup(
      <MonthBarsTooltipCard bar={first!} valueLabel="Gasto" hidden />,
    );

    expect(html).not.toContain('120,00');
  });
});
