import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const ITEM_ID = '0b9a1c3e-5d27-4f64-8a1e-3c7d9e2f4b66';

async function openConnectModal() {
  renderApp('/accounts?new=account');
  return screen.findByRole('dialog', { name: 'Conectar conta' });
}

describe('Conectar conta (?new=account)', () => {
  it('opens from the URL and closes by clearing it', async () => {
    const dialog = await openConnectModal();
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conectar conta' })).not.toBeInTheDocument(),
    );
    expect(window.location.search).not.toContain('new=');
  });

  it('asks for the 36 characters of the item id and puts the focus on the field', async () => {
    const dialog = await openConnectModal();
    const field = await within(dialog).findByRole('textbox', { name: 'ID do item no Meu Pluggy' });

    fireEvent.change(field, { target: { value: 'curto' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conectar banco' }));

    expect(await within(dialog).findByText('O ID do item tem 36 caracteres')).toBeInTheDocument();
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('connects a bank by its item id and shows the first-sync progress', async () => {
    const dialog = await openConnectModal();
    const field = await within(dialog).findByRole('textbox', { name: 'ID do item no Meu Pluggy' });

    fireEvent.change(field, { target: { value: ITEM_ID } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conectar banco' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conectar conta' })).not.toBeInTheDocument(),
    );
    expect(db.connections.some((item) => item.pluggyItemId === ITEM_ID)).toBe(true);
  });

  it('says what went wrong when the Pluggy does not find the item', async () => {
    server.use(
      http.post('/api/sync/connections', () =>
        HttpResponse.json(
          { code: 'SYNC_ITEM_NOT_FOUND', message: 'Item não encontrado' },
          { status: 422 },
        ),
      ),
    );
    const dialog = await openConnectModal();
    const field = await within(dialog).findByRole('textbox', { name: 'ID do item no Meu Pluggy' });

    fireEvent.change(field, { target: { value: ITEM_ID } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conectar banco' }));

    expect(await within(dialog).findByText(/O Pluggy não achou esse item/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Conectar conta' })).toBeInTheDocument();
  });

  it('sends the person to Configurações when the Pluggy keys are missing', async () => {
    server.use(
      http.get('/api/sync/settings', () =>
        HttpResponse.json({ configured: false, clientId: null, updatedAt: null }),
      ),
    );
    const dialog = await openConnectModal();

    expect(await within(dialog).findByText('Falta configurar o Pluggy')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Conectar banco' })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Abrir Configurações' }));
    await waitFor(() => expect(window.location.pathname).toBe('/settings'));
  });

  it('validates the manual card form with the API schema and focuses the first invalid field', async () => {
    const dialog = await openConnectModal();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Conta manual' }));

    const group = await within(dialog).findByRole('group', { name: 'Tipo de conta' });
    fireEvent.click(within(group).getByRole('button', { name: 'Cartão de crédito' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar conta' }));

    expect(await within(dialog).findByText(/Dê um nome à conta/)).toBeInTheDocument();
    expect(within(dialog).getByText('Escolha o banco')).toBeInTheDocument();
    expect(within(dialog).getByText('Dia de fechamento de 1 a 31')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Apelido do cartão' })).toHaveFocus(),
    );
  });

  it('creates a manual checking account with its opening balance', async () => {
    const dialog = await openConnectModal();
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Conta manual' }));

    fireEvent.change(await within(dialog).findByRole('textbox', { name: 'Nome da conta' }), {
      target: { value: 'Conta do Inter' },
    });
    const banks = within(dialog).getByRole('group', { name: 'Banco' });
    fireEvent.click(within(banks).getByRole('button', { name: 'Inter' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Saldo inicial' }), {
      target: { value: '150000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Conectar conta' })).not.toBeInTheDocument(),
    );
    const created = db.accounts.find((item) => item.name === 'Conta do Inter');
    expect(created?.institutionCode).toBe('inter');
    expect(await screen.findByRole('article', { name: 'Conta do Inter' })).toBeInTheDocument();
  });
});
