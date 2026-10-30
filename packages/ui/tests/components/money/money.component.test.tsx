import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Money } from '#/components/money/money.component.tsx';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

describe('Money', () => {
  it('writes integer cents as BRL with the R$ apart from the number', () => {
    const html = renderToStaticMarkup(<Money cents={123456} />);

    expect(html).toContain('R$');
    expect(html).toContain('1.234,56');
  });

  it('shows the sign asked for and "−" for negatives', () => {
    expect(renderToStaticMarkup(<Money cents={1000} sign="plus" />)).toContain('+');
    expect(renderToStaticMarkup(<Money cents={-1000} />)).toContain('−');
    expect(renderToStaticMarkup(<Money cents={1000} sign="none" />)).not.toMatch(/[+−]/);
  });

  it('rounds to whole reais without cents', () => {
    expect(renderToStaticMarkup(<Money cents={58549} showCents={false} />)).toContain('585');
    expect(renderToStaticMarkup(<Money cents={58549} showCents={false} />)).not.toContain('585,');
  });

  it('turns into "R$ ••••" without sign or number when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={-123456} sign="minus" />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).toContain('R$');
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('1.234,56');
    expect(html).not.toContain('−');
  });
});
