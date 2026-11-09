import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  Chip,
  ChoiceChip,
  CountBadge,
  VariationBadge,
  variationTone,
} from '#/components/chips/index.ts';

describe('Chip', () => {
  it('writes the text and picks the tone', () => {
    const html = renderToStaticMarkup(
      <Chip tone="warn" icon="warning">
        Atrasado
      </Chip>,
    );

    expect(html).toContain('Atrasado');
    expect(html).toContain('bg-caution-weak');
    expect(html).toContain('<svg');
  });

  it('draws the dashed and tag chips without fill', () => {
    expect(renderToStaticMarkup(<Chip tone="dashed">Sugestão</Chip>)).toContain('border-dashed');
    expect(renderToStaticMarkup(<Chip tone="tag"># delivery</Chip>)).toContain('border-line');
  });

  it('has a large size', () => {
    expect(renderToStaticMarkup(<Chip large>Mercado</Chip>)).toContain('text-label');
  });

  it('has a compact size, 20 px tall with no vertical padding, for a line of text', () => {
    const html = renderToStaticMarkup(<Chip compact>Mercado</Chip>);

    expect(html).toContain('h-5');
    expect(html).not.toContain('py-s4');
  });
});

describe('CountBadge', () => {
  it('shows the number', () => {
    expect(renderToStaticMarkup(<CountBadge count={12} />)).toContain('>12<');
  });
});

describe('variationTone', () => {
  it('stays neutral under 10% in both directions', () => {
    expect(variationTone(9.9)).toBe('neutral');
    expect(variationTone(-9.9)).toBe('neutral');
    expect(variationTone(0)).toBe('neutral');
  });

  it('colors from 10%: spending up is bad, down is good', () => {
    expect(variationTone(10)).toBe('bad');
    expect(variationTone(-10)).toBe('good');
  });

  it('flips for income', () => {
    expect(variationTone(15, true)).toBe('good');
    expect(variationTone(-15, true)).toBe('bad');
  });
});

describe('VariationBadge', () => {
  it('is gray under 10% (ui adjustment 4)', () => {
    const html = renderToStaticMarkup(<VariationBadge percent={9.9} />);

    expect(html).toContain('9,9%');
    expect(html).toContain('bg-subtle');
    expect(html).toContain('text-fg-secondary');
    expect(html).not.toContain('bg-loss-weak');
  });

  it('turns red from 10% on a rise', () => {
    const html = renderToStaticMarkup(<VariationBadge percent={108} />);

    expect(html).toContain('108%');
    expect(html).toContain('▲');
    expect(html).toContain('bg-loss-weak');
    expect(html).toContain('Alta de');
  });

  it('uses amber for a bad variation when asked', () => {
    expect(renderToStaticMarkup(<VariationBadge percent={20} badTone="caution" />)).toContain(
      'bg-caution-weak',
    );
  });

  it('turns green on a fall of 10% or more', () => {
    const html = renderToStaticMarkup(<VariationBadge percent={-12} />);

    expect(html).toContain('▼');
    expect(html).toContain('bg-gain-weak');
    expect(html).toContain('Queda de');
  });
});

describe('ChoiceChip', () => {
  it('marks the selected chip', () => {
    const html = renderToStaticMarkup(
      <ChoiceChip selected onChange={() => {}}>
        Delivery
      </ChoiceChip>,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('bg-brand-weak');
  });

  it('draws the ghost chip dashed and unselected', () => {
    const html = renderToStaticMarkup(
      <ChoiceChip selected={false} ghost onChange={() => {}}>
        Escolher outra
      </ChoiceChip>,
    );

    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('border-dashed');
  });
});
