import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OverflowMenu } from '#/components/menus/index.ts';

describe('OverflowMenu', () => {
  it('renders a named "…" button, closed by default', () => {
    const html = renderToStaticMarkup(
      <OverflowMenu
        label="Ações de Mercado"
        onAction={() => {}}
        items={[
          { key: 'edit', label: 'Editar', icon: 'edit' },
          { key: 'delete', label: 'Excluir', icon: 'trash', danger: true, separatorBefore: true },
        ]}
      />,
    );

    expect(html).toContain('aria-label="Ações de Mercado"');
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('size-ctl-touch');
  });
});
