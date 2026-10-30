import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  checkSplit,
  SplitEditor,
  SplitSumIndicator,
  type SplitPart,
} from '#/components/transactions/index.ts';

const noop = () => {};
const categories = [
  { id: 'market', name: 'Mercado', icon: 'cart' },
  { id: 'home', name: 'Casa', icon: 'home' },
] as const;

function render(parts: SplitPart[], error?: string) {
  return renderToStaticMarkup(
    <SplitEditor
      totalCents={18732}
      parts={parts}
      onChange={noop}
      categories={categories}
      createPartId={() => 'new'}
      onConfirm={noop}
      onCancel={noop}
      error={error}
    />,
  );
}

describe('SplitEditor', () => {
  it('shows one row per part and confirms the sum when it matches', () => {
    const html = render([
      { id: 'a', categoryId: 'market', amountCents: 10000 },
      { id: 'b', categoryId: 'home', amountCents: 8732 },
    ]);

    expect(html).toContain('Parte 1');
    expect(html).toContain('Parte 2');
    expect(html).toContain('187,32');
    expect(html).toContain('Soma confere');
    expect(html).not.toContain('disabled=""');
  });

  it('says how much is left and keeps "Dividir" off while the sum does not match', () => {
    const html = render([
      { id: 'a', categoryId: 'market', amountCents: 10000 },
      { id: 'b', categoryId: null, amountCents: 8000 },
    ]);

    expect(html).toContain('Faltam');
    expect(html).toContain('7,32');
    expect(html).not.toContain('Soma confere');
    expect(html).toContain('disabled=""');
  });

  it('flags a part with no amount next to its field', () => {
    const html = render([
      { id: 'a', categoryId: 'market', amountCents: 18732 },
      { id: 'b', categoryId: null, amountCents: 0 },
    ]);

    expect(html).toContain('Informe o valor.');
  });

  it('shows a server error', () => {
    const html = render(
      [
        { id: 'a', categoryId: 'market', amountCents: 10000 },
        { id: 'b', categoryId: 'home', amountCents: 8732 },
      ],
      'Não deu para dividir agora.',
    );

    expect(html).toContain('Não deu para dividir agora.');
  });
});

describe('SplitSumIndicator', () => {
  it('writes "Passou" when the parts pass the total', () => {
    const html = renderToStaticMarkup(<SplitSumIndicator check={checkSplit(1000, [800, 500])} />);

    expect(html).toContain('Passou');
    expect(html).toContain('3,00');
    expect(html).toContain('data-status="over"');
  });
});
