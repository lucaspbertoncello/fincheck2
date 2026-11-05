import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CategoryDonut } from '#/components/charts/index.ts';
import { paintSlices } from '#/components/charts/paint-slices.util.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const slices = [
  { id: 'a', name: 'Mercado', cents: 81240, badge: <span>+7%</span> },
  { id: 'b', name: 'Delivery', cents: 41260, badge: <span>+108%</span> },
  { id: 'c', name: 'Transporte', cents: 40215 },
  { id: 'd', name: 'Casa', cents: 40000 },
  { id: 'e', name: 'Outros', cents: 145905, isOther: true },
];

function render(hidden = false) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <CategoryDonut
        slices={slices}
        centerLabel="Gasto"
        centerTitle="Delivery"
        centerDetail="+108% que set."
        aside={<p>cartão</p>}
      />
    </MoneyVisibilityContext>,
  );
}

describe('paintSlices', () => {
  it('paints the four categories chart.1..4 and "Outros" grey, in order', () => {
    expect(paintSlices(slices).map((slice) => slice.color)).toEqual([
      'var(--color-chart-pie-1)',
      'var(--color-chart-pie-2)',
      'var(--color-chart-pie-3)',
      'var(--color-chart-pie-4)',
      'var(--color-chart-pie-other)',
    ]);
  });

  it('folds categories past the fourth into "Outros" instead of making a new hue', () => {
    const many = [
      { id: '1', name: 'A', cents: 500 },
      { id: '2', name: 'B', cents: 400 },
      { id: '3', name: 'C', cents: 300 },
      { id: '4', name: 'D', cents: 200 },
      { id: '5', name: 'E', cents: 100, badge: <span>+1%</span> },
      { id: '6', name: 'F', cents: 50 },
    ];
    const painted = paintSlices(many);
    expect(painted).toHaveLength(5);
    expect(painted[4]).toMatchObject({ name: 'Outros', cents: 150, isOther: true });
    expect(painted[4]?.badge).toBeUndefined();
  });

  it('adds the folded amount to an existing "Outros"', () => {
    const painted = paintSlices([
      ...['A', 'B', 'C', 'D', 'E'].map((name, index) => ({ id: name, name, cents: 100 - index })),
      { id: 'o', name: 'Outros', cents: 10, isOther: true },
    ]);
    expect(painted[4]).toMatchObject({ id: 'o', cents: 10 + 96 });
  });

  it('computes shares that add up to 1', () => {
    const total = paintSlices(slices).reduce((sum, slice) => sum + slice.share, 0);
    expect(total).toBeCloseTo(1);
  });

  it('gives zero shares when everything is zero', () => {
    expect(paintSlices([{ id: 'x', name: 'X', cents: 0 }])[0]?.share).toBe(0);
  });
});

describe('CategoryDonut', () => {
  it('shows the center, one legend row per category, the chip slots and the aside', () => {
    const html = render();
    expect(html).toContain('Gasto');
    expect(html).toContain('+108% que set.');
    for (const name of ['Mercado', 'Delivery', 'Transporte', 'Casa', 'Outros']) {
      expect(html).toContain(name);
    }
    expect(html).toContain('+7%');
    expect(html).toContain('cartão');
  });

  it('writes the legend values in BRL with the Money component', () => {
    const html = render();
    expect(html).toContain('812,40');
    expect(html).toContain('1.459,05');
  });

  it('gives each legend marker the palette color and the share to screen readers', () => {
    const html = render();
    expect(html).toContain('var(--color-chart-pie-2)');
    expect(html).toContain('var(--color-chart-pie-other)');
    expect(html).toMatch(/\d+% do gasto/);
  });

  it('hides the values (legend and table) but keeps the names', () => {
    const html = render(true);
    expect(html).toContain('••••');
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('812,40');
    expect(html).toContain('Mercado');
  });

  it('lays the legend rows on one shared grid: values never cut and the chip column is fixed', () => {
    const html = render();

    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_max-content_5.5rem]');
    expect(html.match(/grid-cols-subgrid/g)?.length).toBe(slices.length);
    expect(html).toMatch(/justify-self-end[^"]*whitespace-nowrap[^"]*tabular-nums/);
  });
});
