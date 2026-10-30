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
    expect(html).toContain('4.625,00');
    expect(html).toContain('4.187,14');
  });

  it('uses the singular for one day', () => {
    const html = renderToStaticMarkup(
      <RemainingLine data={{ daysLeft: 1, incomeCents: 0, expenseCents: 0 }} />,
    );

    expect(html).toMatch(/1<\/span>(<!-- -->)? (<!-- -->)?dia</);
  });

  it('shows a skeleton without data', () => {
    expect(renderToStaticMarkup(<RemainingLine />)).not.toContain('Faltam');
  });
});
