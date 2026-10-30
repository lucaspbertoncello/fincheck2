import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  CategoryGroup,
  CategoryGroupList,
  type CategoryGroupData,
} from '#/components/transactions/index.ts';

const noop = () => {};

const delivery: CategoryGroupData = {
  id: 'delivery',
  name: 'Delivery',
  icon: 'delivery',
  totalCents: 41260,
  sharePercent: 11.8,
  count: 9,
  variationPercent: 108,
  items: [
    {
      id: 'i1',
      dateLabel: '22 out.',
      name: 'Lanchonete Sol',
      accountLabel: 'Nubank, crédito',
      cents: 6890,
    },
    {
      id: 'i2',
      dateLabel: '20 out.',
      name: 'Lanchonete Sol',
      accountLabel: 'Nubank, crédito',
      cents: 5430,
    },
  ],
};

function group(data: CategoryGroupData, expanded = false, kind: 'expense' | 'income' = 'expense') {
  return renderToStaticMarkup(
    <CategoryGroup
      group={data}
      kind={kind}
      expanded={expanded}
      onExpandedChange={noop}
      onSeeAll={noop}
      onReview={noop}
    />,
  );
}

describe('CategoryGroup', () => {
  it('writes name, count, share, value and the variation', () => {
    const html = group(delivery);

    expect(html).toContain('Delivery');
    expect(html).toContain('9 transações');
    expect(html).toContain('11,8%');
    expect(html).toContain('412,60');
    expect(html).toContain('−');
    expect(html).toContain('108%');
    expect(html).toContain('data-tone="bad"');
  });

  it('sizes the share bar from the share, 4 px tall', () => {
    const html = group(delivery);

    expect(html).toContain('width:11.8%');
    expect(html).toContain('h-1');
  });

  it('is a collapsed disclosure that opens to show the transactions', () => {
    expect(group(delivery)).toContain('aria-expanded="false"');

    const open = group(delivery, true);
    expect(open).toContain('aria-expanded="true"');
    expect(open).toContain('Lanchonete Sol');
    expect(open).toContain('22 out.');
    expect(open).toContain('Ver as 9 transações na lista');
  });

  it('shows income with "+" and reads a rise as good', () => {
    const html = group({ ...delivery, name: 'Salário', variationPercent: 20 }, false, 'income');

    expect(html).toContain('+');
    expect(html).toContain('text-gain');
    expect(html).toContain('data-tone="good"');
  });

  it('draws "Sem categoria" with a dashed icon and the "Revisar" button, not expandable', () => {
    const html = group({
      id: 'none',
      name: 'Sem categoria',
      icon: 'inbox',
      uncategorized: true,
      totalCents: 30985,
      sharePercent: 8.9,
      count: 12,
      items: delivery.items,
    });

    expect(html).toContain('border-dashed');
    expect(html).toContain('Revisar');
    expect(html).not.toContain('aria-expanded="true"');
    expect(html).not.toContain('data-tone');
  });

  it('replaces the count line and the variation with the detail and caption', () => {
    const html = group({
      id: 'freela',
      name: 'Freela',
      icon: 'salary',
      totalCents: 0,
      sharePercent: 0,
      count: 0,
      detail: 'Nenhuma ainda',
      caption: 'Previsto 25/10',
    });

    expect(html).toContain('Nenhuma ainda');
    expect(html).toContain('Previsto 25/10');
    expect(html).not.toContain('0 transações');
  });

  it('hides the values when the eye is on, keeping the share', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <CategoryGroup
          group={delivery}
          kind="expense"
          expanded
          onExpandedChange={noop}
          onSeeAll={noop}
        />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('412,60');
    expect(html).not.toContain('68,90');
    expect(html).toContain('11,8%');
  });
});

describe('CategoryGroupList', () => {
  it('writes the block header with the count and total', () => {
    const html = renderToStaticMarkup(
      <CategoryGroupList
        title="Despesas"
        subtitle="por categoria"
        count={10}
        noun={{ singular: 'categoria', plural: 'categorias' }}
        totalCents={348620}
        kind="expense"
      >
        <CategoryGroup group={delivery} kind="expense" expanded={false} onExpandedChange={noop} />
      </CategoryGroupList>,
    );

    expect(html).toContain('Despesas');
    expect(html).toContain('por categoria');
    expect(html).toContain('10 categorias');
    expect(html).toContain('3.486,20');
    expect(html).toContain('Delivery');
  });
});
