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

describe('SegmentedNav with four links (dense)', () => {
  const FOUR = [
    { key: 'a', label: 'Recorrências', href: '/a' },
    { key: 'b', label: 'A pagar e receber', href: '/b' },
    { key: 'c', label: 'Assinaturas', href: '/c' },
    { key: 'd', label: 'Amigos', href: '/d' },
  ];

  it('with `dense`: no icons, 12 px labels, 4 px of padding and items that never shrink, on the phone', () => {
    const items = FOUR.map((item) => ({ ...item, icon: 'calendar' as const }));
    const html = renderToStaticMarkup(
      <SegmentedNav items={items} activeKey="a" label="Seções" dense />,
    );

    expect(count(html, 'max-lg:hidden')).toBe(4);
    expect(count(html, 'max-lg:text-caption')).toBe(4);
    expect(count(html, 'max-lg:px-s4')).toBe(4);
    expect(count(html, 'max-lg:flex-[1_0_auto]')).toBe(4);
    expect(html).not.toContain('max-lg:flex-col');
    expect(html).not.toContain('max-lg:flex-none');
    // The scroll stays as the last resort
    expect(html).toContain('max-lg:overflow-x-auto');
    expect(html).toContain('whitespace-nowrap');
  });

  it('without `dense` keeps the icons and the 14 px labels', () => {
    const items = FOUR.map((item) => ({ ...item, icon: 'calendar' as const }));
    const html = renderToStaticMarkup(<SegmentedNav items={items} activeKey="a" label="Seções" />);

    expect(html).not.toContain('max-lg:hidden');
    expect(html).not.toContain('max-lg:text-caption');
    // The scrolling track belongs to `dense` only
    expect(html).not.toContain('max-lg:overflow-x-auto');
  });

  it('does not fade the edge before it knows there is more to scroll to', () => {
    const html = renderToStaticMarkup(
      <SegmentedNav items={FOUR} activeKey="a" label="Seções" dense />,
    );

    expect(html).not.toContain('data-more');
  });
});
