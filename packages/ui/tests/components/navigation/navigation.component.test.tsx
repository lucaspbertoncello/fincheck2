import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BottomNav } from '#/components/navigation/bottom-nav.component.tsx';
import type { NavItem } from '#/components/navigation/nav-item.type.ts';
import { SegmentedNav } from '#/components/navigation/segmented-nav.component.tsx';

const ITEMS: NavItem[] = [
  { key: 'overview', label: 'Visão geral', href: '/', icon: 'home' },
  { key: 'transactions', label: 'Transações', href: '/transactions', icon: 'transfer' },
  {
    key: 'accounts',
    label: 'Contas e cartões',
    shortLabel: 'Contas',
    href: '/accounts',
    icon: 'card',
  },
];

const count = (html: string, text: string) => html.split(text).length - 1;

describe('BottomNav indicator', () => {
  it('draw one indicator, in the active item only, named for the view transition', () => {
    for (const html of [
      renderToStaticMarkup(<BottomNav items={ITEMS} activeKey="transactions" label="Principal" />),
    ]) {
      expect(count(html, 'tab-indicator')).toBe(1);
      const active = html.slice(html.indexOf('href="/transactions"'));
      expect(active.indexOf('tab-indicator')).toBeLessThan(active.indexOf('href="/accounts"'));
      expect(html).toContain('aria-current="page"');
    }
  });

  it('draw no indicator when no tab is active (Configurações)', () => {
    expect(
      count(
        renderToStaticMarkup(<BottomNav items={ITEMS} activeKey={null} label="P" />),
        'tab-indicator',
      ),
    ).toBe(0);
  });
});

describe('SegmentedNav', () => {
  const items = [
    { key: 'a', label: 'Recorrências', href: '/a' },
    { key: 'b', label: 'A pagar e receber', href: '/b' },
  ];

  it('gives the indicator its own view-transition name, so it slides between two screens', () => {
    const html = renderToStaticMarkup(
      <SegmentedNav items={items} activeKey="b" label="Seções de Recorrentes" />,
    );

    expect(count(html, 'view-transition-name:segment-ind')).toBe(1);
    expect(html).toContain('aria-current="page"');
  });
});

describe('SegmentedNav with three links', () => {
  const LINKS = [
    { key: 'a', label: 'Recorrências', href: '/a' },
    { key: 'b', label: 'A pagar e receber', href: '/b' },
    { key: 'c', label: 'Assinaturas', href: '/c' },
  ];

  it('uses the content-width items with 8 px of padding, so three labels fit on the phone', () => {
    const html = renderToStaticMarkup(<SegmentedNav items={LINKS} activeKey="c" label="Seções" />);

    expect(html).toContain('flex-auto');
    expect(html).toContain('px-s8');
    expect(html).not.toContain('px-s12');
    expect(html).toContain('whitespace-nowrap');
  });

  it('keeps the equal-width items with two links', () => {
    const html = renderToStaticMarkup(
      <SegmentedNav items={LINKS.slice(0, 2)} activeKey="a" label="Seções" />,
    );

    expect(html).toContain('flex-1');
    expect(html).toContain('px-s12');
  });
});
