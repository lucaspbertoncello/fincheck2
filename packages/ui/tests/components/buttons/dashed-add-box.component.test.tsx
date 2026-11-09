import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DashedAddBox } from '#/components/buttons/index.ts';

describe('DashedAddBox', () => {
  it('is a button named by its label, with the dashed border and the dashed plus mark', () => {
    const html = renderToStaticMarkup(
      <DashedAddBox label="Adicionar cartão de crédito" onPress={() => undefined} />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('Adicionar cartão de crédito');
    // The box and the mark inside it are both dashed: the same pattern as the "Nova ..." rows.
    expect(html.match(/border-dashed/g)).toHaveLength(2);
    expect(html).toContain('M12 5v14M5 12h14');
  });

  it('fills its cell, centers its content and never breaks the label', () => {
    const html = renderToStaticMarkup(<DashedAddBox label="Adicionar" onPress={() => undefined} />);

    expect(html).toContain('w-full');
    expect(html).toContain('flex-col items-center justify-center');
    expect(html).toContain('whitespace-nowrap');
    expect(html).toContain('rounded-panel');
  });

  it('takes the class of its place in the grid', () => {
    const html = renderToStaticMarkup(
      <DashedAddBox label="Adicionar" onPress={() => undefined} className="lg:self-stretch" />,
    );

    expect(html).toContain('lg:self-stretch');
  });
});
