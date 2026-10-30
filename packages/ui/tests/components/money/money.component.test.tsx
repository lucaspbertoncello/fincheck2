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

  it('turns into dots without sign or number when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={-123456} sign="minus" />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••••');
    expect(html).toContain('R$');
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('1.234,56');
    expect(html).not.toContain('−');
  });
});

describe('Money with the eye on keeps its width', () => {
  /** The invisible parts hold the shape of the number: "0" per digit, the separators as they are. */
  function reservedShape(html: string): string {
    const masked = html.slice(html.indexOf('data-masked-number'));
    return masked.match(/class="invisible[^"]*">([^<]*)</)?.[1] ?? '';
  }

  const visibleShape = (html: string) => html.replace(/<[^>]*>/g, '');

  it.each([
    [5, '0,05'],
    [123456, '1.234,56'],
    [-98765432, '987.654,32'],
    [100000000, '1.000.000,00'],
  ])('reserves exactly the width of %i cents', (cents, text) => {
    const shown = renderToStaticMarkup(<Money cents={cents} sign="none" />);
    const hidden = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={cents} sign="none" />
      </MoneyVisibilityContext>,
    );

    expect(visibleShape(shown)).toContain(text);
    expect(reservedShape(hidden)).toBe(text.replace(/\d/g, '0'));
    expect(hidden.match(/•/g)).toHaveLength(Math.max(4, text.replace(/\D/g, '').length));
  });

  it('never puts a real digit of the value in the page', () => {
    const hidden = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={987654} />
      </MoneyVisibilityContext>,
    );

    expect(visibleShape(hidden)).not.toMatch(/[1-9]/);
  });

  it('keeps the room of the sign, invisible and without saying which one', () => {
    const hidden = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={-1000} sign="minus" />
      </MoneyVisibilityContext>,
    );

    expect(hidden).toMatch(/class="text-end invisible"[^>]*>\+</);
    expect(hidden).not.toContain('−');
  });

  it('keeps the sign column of a list when hidden', () => {
    const hidden = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={1000} sign="none" signColumn />
      </MoneyVisibilityContext>,
    );

    expect(hidden).toContain('w-sign-col');
  });

  it('shrinks only the dots in the hero, not the box', () => {
    const hidden = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <Money cents={123456} smallDots />
      </MoneyVisibilityContext>,
    );

    expect(hidden).toContain('money-dots-small');
    expect(reservedShape(hidden)).toBe('0.000,00');
  });
});
