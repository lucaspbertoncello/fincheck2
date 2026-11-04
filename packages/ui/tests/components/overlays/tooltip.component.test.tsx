import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from 'react-aria-components';
import { describe, expect, it } from 'vitest';

import { Tooltip } from '#/components/overlays/tooltip.component.tsx';

describe('Tooltip', () => {
  it('renders only its trigger until the pointer or the keyboard reaches it', () => {
    const html = renderToStaticMarkup(
      <Tooltip label="Transações">
        <Button aria-label="Transações">T</Button>
      </Tooltip>,
    );

    expect(html).toContain('aria-label="Transações"');
    expect(html).not.toContain('role="tooltip"');
  });
});
