import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AccountSparkline } from '#/components/charts/index.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const points = [
  { day: 3, cents: 250000 },
  { day: 1, cents: 100000 },
  { day: 2, cents: 180000 },
];

describe('AccountSparkline', () => {
  it('describes the curve from the first to the last point', () => {
    const html = renderToStaticMarkup(<AccountSparkline points={points} label="Saldo de Nubank" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('Saldo de Nubank: de R$ 1.000,00 para R$ 2.500,00');
  });

  it('does not leak the balance when values are hidden', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <AccountSparkline points={points} label="Saldo de Nubank" />
      </MoneyVisibilityContext>,
    );
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('2.500,00');
  });

  it('says there is no data for an empty series', () => {
    const html = renderToStaticMarkup(<AccountSparkline points={[]} label="Saldo de Nubank" />);
    expect(html).toContain('Saldo de Nubank: sem dados');
  });

  it('is 48 px high by default', () => {
    const html = renderToStaticMarkup(<AccountSparkline points={points} label="x" />);
    expect(html).toContain('height:48px');
  });
});
