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
    expect(html).toContain('>3<');
    expect(html).toContain('selecionadas');
    expect(html).toContain('Categorizar');
    expect(html).toContain('Tag');
    expect(html).toContain('Ignorar');
    expect(html).toContain('aria-label="Sair da seleção"');
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
