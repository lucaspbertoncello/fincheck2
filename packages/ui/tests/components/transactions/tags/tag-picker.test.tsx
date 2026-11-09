import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  TagPicker,
  buildTagRows,
  moveActiveRow,
  type TagPickerProps,
} from '#/components/transactions/index.ts';

const noop = () => {};
const OPTIONS = [
  { id: 'a', name: 'Promoção' },
  { id: 'b', name: 'viagem' },
  { id: 'c', name: 'trabalho' },
];

function picker(overrides: Partial<TagPickerProps> = {}) {
  return renderToStaticMarkup(
    <TagPicker
      label="Tags"
      categoryName="Mercado"
      options={OPTIONS}
      selected={[{ id: 'b', name: 'viagem' }]}
      onChange={noop}
      onCreate={() => Promise.resolve('new')}
      {...overrides}
    />,
  );
}

describe('buildTagRows', () => {
  it('lists every tag for an empty text, marking the selected ones, and offers nothing to create', () => {
    expect(buildTagRows(OPTIONS, ['b'], '')).toEqual([
      { kind: 'tag', id: 'a', name: 'Promoção', selected: false },
      { kind: 'tag', id: 'b', name: 'viagem', selected: true },
      { kind: 'tag', id: 'c', name: 'trabalho', selected: false },
    ]);
  });

  it('filters by what the text is inside of, with no difference for case or accent', () => {
    const rows = buildTagRows(OPTIONS, [], 'PROMO');

    expect(rows.map((row) => row.kind === 'tag' && row.name)).toEqual(['Promoção', false]);
  });

  it('offers to create the typed text when no name is exactly that, trimmed', () => {
    expect(buildTagRows(OPTIONS, [], '  promo  ').at(-1)).toEqual({
      kind: 'create',
      name: 'promo',
    });
    expect(buildTagRows(OPTIONS, [], 'xyz')).toEqual([{ kind: 'create', name: 'xyz' }]);
  });

  it('does not offer to create a name that already exists, whatever the case or the accent', () => {
    expect(buildTagRows(OPTIONS, [], 'promocao').some((row) => row.kind === 'create')).toBe(false);
    expect(buildTagRows(OPTIONS, [], 'VIAGEM').some((row) => row.kind === 'create')).toBe(false);
  });
});

describe('moveActiveRow', () => {
  it('goes down and up, wrapping around, and enters the list from the right end', () => {
    expect(moveActiveRow(-1, 1, 3)).toBe(0);
    expect(moveActiveRow(-1, -1, 3)).toBe(2);
    expect(moveActiveRow(2, 1, 3)).toBe(0);
    expect(moveActiveRow(0, -1, 3)).toBe(2);
    expect(moveActiveRow(1, 1, 3)).toBe(2);
  });

  it('has no active line in an empty list', () => {
    expect(moveActiveRow(-1, 1, 0)).toBe(-1);
  });
});

describe('TagPicker', () => {
  it('lists the tags of the category, marks the selected one and names the category', () => {
    const html = picker();

    expect(html).toContain('em Mercado');
    expect(html).toContain('Promoção');
    expect(html).toContain('trabalho');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Remover a tag viagem');
    expect(html).toContain('role="combobox"');
  });

  it('asks for a category first when the transaction has none, with no field', () => {
    const html = picker({ categoryName: null });

    expect(html).toContain('Escolha a categoria');
    expect(html).not.toContain('role="combobox"');
  });

  it('says the category has no tags yet and invites to type the first one', () => {
    const html = picker({ options: [], selected: [] });

    expect(html).toContain('Nenhuma tag em Mercado ainda');
    expect(html).toContain('Nome da primeira tag');
  });

  it('shows the loading and the error states, the error with a way to try again', () => {
    expect(picker({ status: 'loading' })).toContain('Carregando as tags de Mercado');
    const error = picker({ status: 'error', onRetry: noop });

    expect(error).toContain('Não deu para carregar as tags.');
    expect(error).toContain('Tentar de novo');
    expect(error).not.toContain('role="combobox"');
  });
});
