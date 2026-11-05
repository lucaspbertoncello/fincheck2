import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConnectionRow } from '#/features/settings/settings/connections/components/connection-row.component.tsx';
import type { ConnectionItem } from '#/features/settings/settings/connections/types/connection-item.type.ts';

const ITEM: ConnectionItem = {
  id: 'c1',
  name: 'Nubank',
  bankTheme: 'nubank',
  status: 'active',
  updateLine: 'Atualizado pelo banco há 12 min',
  errorReason: null,
  isStale: false,
  historyLine: null,
  pendingMatches: [],
};

const noop = () => undefined;

describe('ConnectionRow', () => {
  it('is a standard row with "Desconectar" on the strip and the update as the detail', () => {
    const html = renderToStaticMarkup(<ConnectionRow item={ITEM} onDisconnect={noop} />);

    expect(html.startsWith('<li ')).toBe(true);
    expect(html).toContain('Atualizado pelo banco há 12 min');
    expect(html).toContain('col-start-1 row-start-3');
    expect(html).toContain('Desconectar');
    expect(html).not.toContain('col-start-3 row-start-1');
  });

  it('badges the error, keeps its reason in the detail and links back to the Open Finance', () => {
    const html = renderToStaticMarkup(
      <ConnectionRow
        item={{ ...ITEM, status: 'error', errorReason: 'login com erro', isStale: true }}
        onDisconnect={noop}
      />,
    );

    expect(html).toContain('Conexão com erro');
    expect(html).toContain('Dados desatualizados');
    expect(html).toContain('login com erro');
    expect(html).toContain('Reconectar no Open Finance');
    expect(html).not.toContain('Pluggy');
  });

  it('carries the pending choices in the strip, on the full width of it', () => {
    const html = renderToStaticMarkup(
      <ConnectionRow item={ITEM} onDisconnect={noop} pending={<p>Qual conta?</p>} />,
    );

    expect(html).toContain('<div class="w-full"><p>Qual conta?</p></div>');
  });
});
