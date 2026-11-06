import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { niceValueRange } from '#/components/charts/nice-value-range.util.ts';
import { ValueTrendChart } from '#/components/charts/index.ts';
import { ValueTrendTooltipCard } from '#/components/charts/value-trend-tooltip.component.tsx';
import { valueTrendXTicks } from '#/components/charts/value-trend-x-ticks.util.ts';

const points = Array.from({ length: 12 }, (_, index) => ({
  key: `2026-10-${String(index + 1).padStart(2, '0')}`,
  label: `${String(index + 1).padStart(2, '0')}/10`,
  fullLabel: `${index + 1}/10 às 03:00`,
  value: 2 + index * 0.05,
}));

const formatValue = (value: number) => `${value.toFixed(2).replace('.', ',')} MB`;

function render(list = points) {
  return renderToStaticMarkup(
    <ValueTrendChart
      title="Tamanho do banco nos últimos backups"
      valueLabel="Tamanho"
      points={list}
      formatValue={formatValue}
      formatAxisValue={formatValue}
    />,
  );
}

describe('ValueTrendChart', () => {
  it('is a named region with the plot hidden from assistive tech', () => {
    const html = render();

    expect(html).toContain('aria-label="Tamanho do banco nos últimos backups"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('has a table twin with one row per point, in the page formatter', () => {
    const html = render();

    expect(html).toContain('<caption>Tamanho do banco nos últimos backups</caption>');
    expect(html).toContain('>Momento<');
    expect(html).toContain('>Tamanho<');
    expect(html).toContain('1/10 às 03:00');
    expect(html).toContain('2,55 MB');
    expect(html.match(/<tr>/g)).toHaveLength(13); // the header and 12 points
  });

  it('writes the empty message over an empty plot instead of breaking', () => {
    const html = renderToStaticMarkup(
      <ValueTrendChart
        title="Tamanho"
        valueLabel="Tamanho"
        points={[]}
        formatValue={formatValue}
        formatAxisValue={formatValue}
        emptyMessage="Sem backups ainda"
      />,
    );

    expect(html).toContain('Sem backups ainda');
  });

  it('shows the moment, the measure and the value on the tip', () => {
    const html = renderToStaticMarkup(
      <ValueTrendTooltipCard point={points[0]!} valueLabel="Tamanho" valueText="2,00 MB" />,
    );

    expect(html).toContain('1/10 às 03:00');
    expect(html).toContain('Tamanho');
    expect(html).toContain('2,00 MB');
  });
});

describe('niceValueRange', () => {
  it('frames a slow growth with round ticks that do not start at zero', () => {
    const range = niceValueRange(2.0, 2.6);

    expect(range.bottom).toBeGreaterThan(0);
    expect(range.bottom).toBeLessThanOrEqual(2.0);
    expect(range.top).toBeGreaterThanOrEqual(2.6);
    expect(range.ticks.length).toBeLessThanOrEqual(6);
    expect(range.ticks[0]).toBe(range.bottom);
    expect(range.ticks.at(-1)).toBe(range.top);
  });

  it('still gives a frame when every value is the same', () => {
    const range = niceValueRange(3, 3);

    expect(range.top).toBeGreaterThan(range.bottom);
    expect(range.bottom).toBeLessThanOrEqual(3);
    expect(range.top).toBeGreaterThanOrEqual(3);
  });
});

describe('valueTrendXTicks', () => {
  it('keeps every key of a short series', () => {
    expect(valueTrendXTicks(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('picks about five keys of a long series, first and last included', () => {
    const keys = Array.from({ length: 30 }, (_, index) => `k${index}`);
    const ticks = valueTrendXTicks(keys);

    expect(ticks).toHaveLength(5);
    expect(ticks[0]).toBe('k0');
    expect(ticks.at(-1)).toBe('k29');
  });
});
