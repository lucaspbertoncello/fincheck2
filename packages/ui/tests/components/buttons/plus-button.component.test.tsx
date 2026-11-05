import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PlusButton } from '#/components/buttons/plus-button.component.tsx';

describe('PlusButton', () => {
  it('is a 56 px circle (touch target above 48 px) with the system shadow and a focus ring, no text', () => {
    const html = renderToStaticMarkup(<PlusButton label="Criar" />);

    expect(html).toContain('size-14');
    expect(html).toContain('shadow-(--shadow-plus)');
    expect(html).toContain('focus-ring');
    expect(html).toContain('aria-label="Criar"');
  });
});
