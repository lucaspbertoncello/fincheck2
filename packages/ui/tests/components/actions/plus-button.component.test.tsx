import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlusButton } from '#/components/actions/plus-button.component.tsx';

describe('PlusButton', () => {
  it('is a 44 px circle with no text by default', () => {
    const html = renderToStaticMarkup(<PlusButton label="Criar" />);

    expect(html).toContain('size-ctl-touch');
    expect(html).toContain('aria-label="Criar"');
  });

  it('in the rail form is 40 px high, fills its width and carries the visible text', () => {
    const html = renderToStaticMarkup(
      <PlusButton label="Nova transação" compact>
        <span>Nova transação</span>
      </PlusButton>,
    );

    expect(html).toContain('h-ctl-tab');
    expect(html).toContain('w-full');
    expect(html).not.toContain('size-ctl-touch');
    expect(html).toContain('<span>Nova transação</span>');
  });
});
