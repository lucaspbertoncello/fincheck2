import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  CategoryFilter,
  CategoryList,
  sortCategories,
  TagChip,
  TagList,
  type ManagedCategory,
} from '#/components/categories/index.ts';

const noop = () => {};

const CATEGORIES: ManagedCategory[] = [
  {
    id: 'c3',
    name: 'Transporte',
    icon: 'car',
    transactionCount: 221,
    ruleCount: 1,
    lastUsedLabel: 'hoje',
  },
  {
    id: 'c1',
    name: 'Academia',
    icon: 'gym',
    transactionCount: 12,
    ruleCount: 0,
    lastUsedLabel: '3 out.',
  },
  {
    id: 'c2',
    name: 'Égua',
    icon: 'pet',
    transactionCount: 1,
    ruleCount: 2,
    lastUsedLabel: 'ontem',
  },
];

const ARCHIVED: ManagedCategory = {
  id: 'c9',
  name: 'Viagens',
  icon: 'plane',
  transactionCount: 27,
  ruleCount: 0,
  lastUsedLabel: 'maio',
  archived: true,
  archivedNote: 'Despesa · 27 transações · usada até maio',
};

const HANDLERS = { onEdit: noop, onArchive: noop, onRestore: noop };

describe('sortCategories', () => {
  it('orders by name in Portuguese without touching the input', () => {
    const sorted = sortCategories(CATEGORIES);
    expect(sorted.map((c) => c.name)).toEqual(['Academia', 'Égua', 'Transporte']);
    expect(CATEGORIES[0]?.name).toBe('Transporte');
  });
});

describe('CategoryList', () => {
  it('lists active categories A to Z with counts, rules and last use', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="Categorias de despesa" {...HANDLERS} />,
    );

    expect(html.indexOf('Academia')).toBeLessThan(html.indexOf('Transporte'));
    expect(html).toContain('aria-label="Categorias de despesa"');
    expect(html).toContain('2 regras · último uso ontem');
    expect(html).toContain('Sem regras · último uso 3 out.');
    expect(html).toContain('>221<');
    expect(html).toContain('>transações<');
    expect(html).toContain('>transação<');
  });

  it('is a plain list of standard rows, not a table: the count is the value at the right end', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="Categorias" {...HANDLERS} />,
    );

    expect(html).not.toContain('role="table"');
    expect(html).not.toContain('role="row"');
    expect(html).not.toContain('role="columnheader"');
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain('col-start-3 row-start-1');
    expect(html).toContain('aria-label="Abrir Academia"');
    expect(html).toContain('truncate');
  });

  it('gives each row a named "…" menu', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="Categorias" {...HANDLERS} />,
    );
    expect(html).toContain('aria-label="Ações de Academia"');
    expect(html.match(/aria-haspopup="true"/g)).toHaveLength(3);
  });

  it('draws the archived rows dashed and dimmed with "Desarquivar" on the strip', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={[ARCHIVED]} label="Arquivadas" {...HANDLERS} />,
    );

    expect(html).toContain('border-dashed');
    expect(html).toContain('text-fg-secondary');
    expect(html).toContain('col-start-1 row-start-3');
    expect(html).toContain('lg:col-start-2');
    expect(html).toContain('Despesa · 27 transações · usada até maio');
    expect(html).toContain('Desarquivar');
    expect(html).not.toContain('aria-haspopup');
  });

  it('ends with "Nova categoria" only when it can create', () => {
    const withCreate = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="C" {...HANDLERS} onCreate={noop} />,
    );
    expect(withCreate).toContain('Nova categoria');
    expect(withCreate).toContain('text-brand');

    const without = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="C" {...HANDLERS} />,
    );
    expect(without).not.toContain('Nova categoria');
  });

  it('says so when nothing matches the search', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={[]} label="C" {...HANDLERS} onCreate={noop} />,
    );
    expect(html).toContain('Nenhuma categoria com esse nome.');
    expect(html).not.toContain('role="table"');
    expect(html).toContain('Nova categoria');
  });

  it('shows no money anywhere', () => {
    const html = renderToStaticMarkup(
      <CategoryList categories={CATEGORIES} label="C" {...HANDLERS} />,
    );
    expect(html).not.toContain('R$');
  });
});

describe('CategoryFilter', () => {
  it('shows the search, the three views with their counts and the selected one', () => {
    const html = renderToStaticMarkup(
      <CategoryFilter
        search=""
        onSearchChange={noop}
        filter="income"
        onFilterChange={noop}
        counts={{ expense: 12, income: 5, archived: 2, tags: 3 }}
      />,
    );

    expect(html).toContain('Buscar categoria');
    expect(html).toContain('Despesas 12');
    expect(html).toContain('Receitas 5');
    expect(html).toContain('Arquivadas 2');
    expect(html).toContain('aria-label="Tipo de categoria"');
  });
});

describe('TagChip and TagList', () => {
  const TAG = { id: 't1', name: 'delivery', transactionCount: 214 };
  const TAG_HANDLERS = { onRename: noop, onArchive: noop, onRestore: noop };

  it('writes the name, the count and a named menu', () => {
    const html = renderToStaticMarkup(<TagChip tag={TAG} {...TAG_HANDLERS} />);

    expect(html).toContain('delivery');
    expect(html).toContain('214');
    expect(html).toContain('transações');
    expect(html).toContain('aria-label="Ações da tag delivery"');
    expect(html).toContain('h-ctl-touch');
    expect(html).toContain('lg:h-8');
  });

  it('dims an archived tag', () => {
    const html = renderToStaticMarkup(
      <TagChip tag={{ ...TAG, archived: true }} {...TAG_HANDLERS} />,
    );
    expect(html).toContain('text-fg-secondary');
    expect(html).toContain('font-plain');
  });

  it('lists the tags and ends with "Nova tag"', () => {
    const html = renderToStaticMarkup(
      <TagList
        label="Tags"
        tags={[TAG, { id: 't2', name: 'presente', transactionCount: 17 }]}
        {...TAG_HANDLERS}
        onCreate={noop}
      />,
    );

    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain('presente');
    expect(html).toContain('Nova tag');
    expect(html).toContain('border-dashed');
  });
});
