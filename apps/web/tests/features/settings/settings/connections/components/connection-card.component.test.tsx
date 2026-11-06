import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ConnectionCard } from '#/features/settings/settings/connections/components/connection-card.component.tsx';
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
  accounts: [
    { id: 'a1', name: 'Nubank', kindLabel: 'Conta corrente', icon: 'wallet' },
    { id: 'a2', name: 'Nubank Ultravioleta', kindLabel: 'Cartão de crédito', icon: 'card' },
  ],
  pendingMatches: [],
};

const noop = () => undefined;

function render(item: ConnectionItem, pending?: ReactNode) {
  return renderToStaticMarkup(<ConnectionCard item={item} onDisconnect={noop} pending={pending} />);
}

describe('ConnectionCard', () => {
  it('is a glass card with the name, the update line and the "Conectado" badge', () => {
    const html = render(ITEM);

    expect(html.startsWith('<li>')).toBe(true);
    expect(html).toContain('<article');
    expect(html).toContain('glass');
    expect(html).toContain('>Nubank</h3>');
    expect(html).toContain('Atualizado pelo banco há 12 min');
    expect(html).toContain('Conectado');
    expect(html).not.toContain('Conexão com erro');
  });

  it('lists the accounts and cards the bank brings', () => {
    const html = render(ITEM);

    expect(html).toContain('Contas e cartões que o banco traz');
    expect(html).toContain('Nubank · Conta corrente');
    expect(html).toContain('Nubank Ultravioleta · Cartão de crédito');
  });

  it('says so when the bank brought no account yet', () => {
    expect(render({ ...ITEM, accounts: [] })).toContain('Nenhuma conta ou cartão lido ainda.');
  });

  it('has "Desconectar" as a secondary button, with no destructive color on the card', () => {
    const html = render(ITEM);

    expect(html).toContain('Desconectar');
    expect(html).toContain('border border-line text-fg-primary');
    expect(html).not.toContain('text-loss');
    expect(html).not.toContain('gradient-danger');
  });

  it('badges the error, keeps its reason and offers "Reconectar" as a primary link button', () => {
    const html = render({ ...ITEM, status: 'error', errorReason: 'login com erro', isStale: true });

    expect(html).toContain('Conexão com erro');
    expect(html).toContain('Dados desatualizados');
    expect(html).not.toContain('>Conectado<');
    expect(html).toContain('login com erro');
    expect(html).toContain('Reconectar no Open Finance');
    expect(html).toContain('href="https://meu.pluggy.ai"');
    expect(html).toContain('gradient-button');
    expect(html).not.toContain('Pluggy');
  });

  it('carries the pending choices at the end of the card', () => {
    const html = render(ITEM, <p>Qual conta?</p>);

    expect(html).toContain('<p>Qual conta?</p></article>');
  });
});
