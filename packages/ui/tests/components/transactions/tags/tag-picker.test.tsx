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
  it('lists every tag for an empty text, marking the selected ones, and ends in the fixed "Nova tag" line', () => {
    expect(buildTagRows(OPTIONS, ['b'], '')).toEqual([
      { kind: 'tag', id: 'a', name: 'Promoção', selected: false },
      { kind: 'tag', id: 'b', name: 'viagem', selected: true },
      { kind: 'tag', id: 'c', name: 'trabalho', selected: false },
      { kind: 'new' },
    ]);
  });

  it('has only "Nova tag" when the category has no tag, and treats blank text as empty', () => {
    expect(buildTagRows([], [], '')).toEqual([{ kind: 'new' }]);
    expect(buildTagRows(OPTIONS, [], '   ').at(-1)).toEqual({ kind: 'new' });
  });

  it('filters by what the text is inside of, with no difference for case or accent', () => {
    const rows = buildTagRows(OPTIONS, [], 'PROMO');

    expect(rows.map((row) => row.kind === 'tag' && row.name)).toEqual(['Promoção', false]);
    expect(rows.some((row) => row.kind === 'new')).toBe(false);
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
    // And the fixed line goes away too: a name is typed, "Nova tag" would have nothing to ask.
    expect(buildTagRows(OPTIONS, [], 'VIAGEM').some((row) => row.kind === 'new')).toBe(false);
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

  it('ends the list in the fixed "Nova tag" line, which is not a marked tag', () => {
    const html = picker();

    expect(html).toContain('Nova tag');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it('asks for a category first when the transaction has none, with no field', () => {
    const html = picker({ categoryName: null });

    expect(html).toContain('Escolha a categoria');
    expect(html).not.toContain('role="combobox"');
  });

  it('says the category has no tags yet and invites to type the first one', () => {
    const html = picker({ options: [], selected: [] });

    expect(html).toContain('Nenhuma tag em Mercado ainda');
    expect(html).toContain('Nova tag');
    expect(html).toContain('Nome da primeira tag');
  });

  it('shows the loading and the error states, the error with a way to try again', () => {
    expect(picker({ status: 'loading' })).toContain('Carregando as tags de Mercado');
    expect(picker({ status: 'loading' })).not.toContain('Nova tag');
    const error = picker({ status: 'error', onRetry: noop });

    expect(error).toContain('Não deu para carregar as tags.');
    expect(error).toContain('Tentar de novo');
    expect(error).not.toContain('role="combobox"');
  });
});

describe('TagPicker without the fixed line', () => {
  it('leaves "Nova tag" out when offersNewLine is false', () => {
    const html = picker({ offersNewLine: false });

    expect(html).not.toContain('Nova tag');
    expect(buildTagRows(OPTIONS, [], '', false).some((row) => row.kind === 'new')).toBe(false);
  });
});
