import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MetricCard } from '#/components/summary/index.ts';

describe('MetricCard', () => {
  it('draws the icon mark, the label, the value and the lines inside the bordered box', () => {
    const html = renderToStaticMarkup(
      <MetricCard
        icon="trend"
        label="Receitas"
        value="R$ 10,00"
        lines={<span>de R$ 20,00</span>}
      />,
    );

    expect(html).toContain('aria-label="Receitas"');
    expect(html).toContain('border-line');
    expect(html).toContain('rounded-capsule');
    expect(html).toContain('R$ 10,00');
    expect(html).toContain('de R$ 20,00');
  });

  it('writes the empty text and keeps the lines area when there is no value', () => {
    const html = renderToStaticMarkup(<MetricCard icon="trend" label="Maior Pix" value={null} />);

    expect(html).toContain('Ainda sem dado');
    expect(html).toContain('h-10');
  });

  it('draws blocks instead of the value while loading', () => {
    const html = renderToStaticMarkup(
      <MetricCard icon="trend" label="Maior Pix" value="R$ 1,00" isLoading />,
    );

    expect(html).not.toContain('R$ 1,00');
    expect(html).toContain('h-6 w-2/3');
  });

  it('shows the badge and the footer when given', () => {
    const html = renderToStaticMarkup(
      <MetricCard icon="trend" label="Receitas" value="1" badge="45%" footer={<i>barra</i>} />,
    );

    expect(html).toContain('45%');
    expect(html).toContain('barra');
  });

  it('keeps the badge row, invisible, when asked to and there is no badge', () => {
    const reserved = renderToStaticMarkup(
      <MetricCard icon="trend" label="Despesas" value="R$ 0,00" reserveBadge />,
    );
    const plain = renderToStaticMarkup(
      <MetricCard icon="trend" label="Maior Pix" value="R$ 1,00" />,
    );

    expect(reserved).toContain('aria-hidden="true" class="invisible flex px-s8 py-s4 text-meta"');
    expect(plain).not.toContain('invisible flex');
  });

  it('shows the badge, not the placeholder, when there is one', () => {
    const html = renderToStaticMarkup(
      <MetricCard icon="trend" label="Receitas" value="1" badge="45%" reserveBadge />,
    );

    expect(html).toContain('45%');
    expect(html).not.toContain('invisible flex');
  });
});
