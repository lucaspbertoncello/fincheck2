import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SelectionBar, SelectionToggle } from '#/components/transactions/index.ts';

const noop = () => {};

describe('SelectionToggle', () => {
  it('shows "Selecionar" with a visible label when the mode is off', () => {
    const html = renderToStaticMarkup(<SelectionToggle active={false} count={0} onToggle={noop} />);

    expect(html).toContain('Selecionar');
    expect(html).toContain('<svg');
  });

  it('turns into the text "Concluir · N" when the mode is on', () => {
    const html = renderToStaticMarkup(<SelectionToggle active count={3} onToggle={noop} />);

    expect(html).toContain('Concluir · 3');
    expect(html).not.toContain('<svg');
  });
});

describe('SelectionBar', () => {
  it('counts the selected rows and offers the three actions', () => {
    const html = renderToStaticMarkup(<SelectionBar count={3} onAction={noop} onClose={noop} />);

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('data-selection-bar'); // the shell hides the floating "+" while it is open
    expect(html).toContain('>3<');
    expect(html).toContain('selecionadas');
    expect(html).toContain('Categorizar');
    expect(html).toContain('Tag');
    expect(html).toContain('Ignorar');
    expect(html).toContain('aria-label="Sair da seleção"');
  });

  it('sits above the bottom navigation on the phone and keeps the desktop offset', () => {
    const html = renderToStaticMarkup(<SelectionBar count={2} onAction={noop} onClose={noop} />);

    expect(html).toContain(
      'bottom-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom)+var(--space-16))]',
    );
    expect(html).toContain('lg:bottom-s24');
    expect(html).not.toContain(' bottom-s16');
  });

  it('never wraps the counter and leaves room for "999 selecionadas" in 343 px on the phone', () => {
    const html = renderToStaticMarkup(<SelectionBar count={999} onAction={noop} onClose={noop} />);
    const counter = /<p[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';
    const bar = /<div[^>]*role="toolbar"[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';

    expect(counter).toContain('whitespace-nowrap');
    expect(counter).toContain('shrink-0');
    // phone budget: 343 - 2 (border) - 16 (bar padding) = 325 for counter, 3 x 44 icons, close 44 and gaps
    expect(bar).toContain('gap-s4');
    expect(bar).toContain('lg:gap-s12');
    expect(counter).toContain('px-s4');
    expect(counter).toContain('lg:px-s8');
    // icon buttons stay 44 wide on the phone with less side padding; the desktop keeps its 12
    expect(html).toContain('min-w-ctl-touch');
    expect(html).toContain('px-s8');
    expect(html).toContain('lg:px-s12');
  });

  it('uses the singular for one row', () => {
    const html = renderToStaticMarkup(<SelectionBar count={1} onAction={noop} onClose={noop} />);

    expect(html).toContain('selecionada<');
    expect(html).not.toContain('</span> selecionadas<');
  });

  it('keeps the labels for screen readers on the phone and floats at the foot', () => {
    const html = renderToStaticMarkup(<SelectionBar count={2} onAction={noop} onClose={noop} />);

    expect(html).toContain('sr-only lg:not-sr-only');
    expect(html).toContain('sticky');
    expect(html).toContain('rounded-panel');
    expect(html).not.toContain('rounded-capsule bg-glass');
  });
});
