import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CategoryIcon, Icon } from '#/components/icons/index.ts';
import { ICON_MARKUP } from '#/components/icons/icon-markup.constant.ts';

describe('icon set', () => {
  it('has the 75 icons of the vault, each with markup', () => {
    const names = Object.keys(ICON_MARKUP);

    expect(names).toHaveLength(75);
    for (const name of names) {
      expect(ICON_MARKUP[name as keyof typeof ICON_MARKUP]).toMatch(/^</);
    }
  });

  it('keeps the shell icon names', () => {
    for (const name of ['home', 'transfer', 'plus-circle', 'eye-off', 'chevron-down', 'warning']) {
      expect(ICON_MARKUP).toHaveProperty(name);
    }
  });

  it('renders any icon hidden from screen readers', () => {
    const html = renderToStaticMarkup(<Icon name="gym" size="lg" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('size-icon-lg');
  });
});

describe('CategoryIcon', () => {
  it('draws the icon in the secondary color over the subtle surface (ui adjustment 10)', () => {
    const html = renderToStaticMarkup(<CategoryIcon icon="food" />);

    expect(html).toContain('bg-subtle');
    expect(html).toContain('text-fg-secondary');
    expect(html).toContain('size-9 lg:size-10');
    expect(html).not.toContain('border-dashed');
  });

  it('dashes the border for an archived category', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="food" dashed />)).toContain('border-dashed');
  });

  it('adds the type badge in the right color', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="food" type="income" />)).toContain('text-gain');
    expect(renderToStaticMarkup(<CategoryIcon icon="food" type="expense" />)).toContain(
      'text-loss',
    );
    expect(renderToStaticMarkup(<CategoryIcon icon="food" />)).not.toContain('data-type');
  });
});
