import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RemainingLine } from '#/components/page/remaining-line.component.tsx';

describe('RemainingLine', () => {
  it('writes the days, what still comes in and what still goes out', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 10, incomeCents: 462500, expenseCents: 418714 }} />,
    );

    expect(html).toContain('Faltam');
    expect(html).toContain('dias');
    expect(html).toContain('Ainda entram');
    expect(html).toContain('Ainda saem');
    expect(html).toContain('4.625,00');
    expect(html).toContain('4.187,14');
  });

  it('colors what comes in green with "+" and what goes out red with "−"', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 10, incomeCents: 462500, expenseCents: 418714 }} />,
    );

    expect(html).toContain('text-gain');
    expect(html).toContain('text-loss');
    expect(html).toContain('+');
    expect(html).toContain('−');
  });

  it('does not sign or color a zero', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 3, incomeCents: 0, expenseCents: 0 }} />,
    );

    expect(html).not.toContain('text-gain');
    expect(html).not.toContain('text-loss');
    expect(html).not.toContain('−');
  });

  it('uses the singular for one day', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 1, incomeCents: 0, expenseCents: 0 }} />,
    );

    expect(html).toMatch(/>1(<!-- -->)? (<!-- -->)?dia</);
  });

  it('never breaks a cell inside', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 10, incomeCents: 1, expenseCents: 1 }} />,
    );

    expect(html.match(/whitespace-nowrap/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('shows a skeleton without data', () => {
    expect(renderToStaticMarkup(<RemainingLine />)).not.toContain('Faltam');
  });
});
