import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadApp } from '#/shared/utils/reload-app.util.ts';
import { setTheme } from '#/shared/stores/theme.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { createUser } from '#tests/support/interaction/create-user.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

vi.mock('#/shared/utils/reload-app.util.ts', () => ({ reloadApp: vi.fn() }));

resetDatabaseBeforeEach();

let media: ReturnType<typeof stubMatchMedia>;
const scrollIntoView = vi.fn();

beforeEach(() => {
  media = stubMatchMedia();
  window.localStorage.clear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  setTheme('light'); // stops following the system theme
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  media.restore();
});

async function openSettings() {
  renderApp('/settings');
  return screen.findByRole('heading', { level: 1, name: 'Configurações' });
}

describe('SettingsPage', () => {
  describe('Conexões', () => {
    it('lists the banks with what the Pluggy last did, and flags the stale one', async () => {
      await openSettings();

      expect(await screen.findByText('Pluggy conectado')).toBeInTheDocument();
      expect(screen.getByText('Nubank', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getByText('Bradesco', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getAllByText(/Atualizado pelo Pluggy há/)).toHaveLength(2);
      expect(screen.getByText('Dados desatualizados')).toBeInTheDocument();
      expect(screen.queryByText(/Sincronizar agora/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Sincronizar sozinho/)).not.toBeInTheDocument();
    });

    it('shows the connection error with the way back through Meu Pluggy', async () => {
      const bradesco = db.connections.find(
        (connection) => connection.institutionCode === 'bradesco',
      );
      if (!bradesco) throw new Error('seed without Bradesco');
      bradesco.status = 'error';
      bradesco.errorCode = 'LOGIN_ERROR';

      await openSettings();

      expect(await screen.findByText(/Conexão com erro, login com erro/)).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Reconectar no Meu Pluggy' });
      expect(link).toHaveAttribute('href', 'https://meu.pluggy.ai');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('asks before disconnecting and removes the bank from the list', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: /Desconectar Nubank/ }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByRole('heading', { name: 'Desconectar o Nubank?' })).toBeVisible();
      expect(screen.getByText('Nubank', { selector: 'p' })).toBeInTheDocument(); // still there until confirmed

      await user.click(within(dialog).getByRole('button', { name: 'Desconectar' }));

      await waitFor(() =>
        expect(screen.queryByText('Nubank', { selector: 'p' })).not.toBeInTheDocument(),
      );
      expect(screen.getByText('Bradesco', { selector: 'p' })).toBeInTheDocument();
    });

    it('keeps the bank when the confirmation is cancelled', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: /Desconectar Nubank/ }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
      );

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(screen.getByText('Nubank', { selector: 'p' })).toBeInTheDocument();
    });

    it('shows the error beside the action when the disconnect fails', async () => {
      server.use(
        http.delete('/api/sync/connections/:id', () =>
          HttpResponse.json({ code: 'SYNC_CONNECTION_NOT_FOUND', message: 'x' }, { status: 404 }),
        ),
      );
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: /Desconectar Nubank/ }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Desconectar' }),
      );

      expect(await screen.findByText('Essa conexão não existe mais.')).toBeInTheDocument();
      expect(screen.getByText('Nubank', { selector: 'p' })).toBeInTheDocument();
    });

    it('lets the person say which existing account is the reconnected one, or another account', async () => {
      let sent: unknown = null;
      server.use(
        http.get('/api/sync/connections', () =>
          HttpResponse.json({
            items: [
              {
                id: '0196e2a0-0000-7000-8000-000000000001',
                institutionCode: 'nubank',
                institutionName: 'Nubank',
                status: 'active',
                errorCode: null,
                lastBankUpdateAt: new Date().toISOString(),
                lastSuccessAt: new Date().toISOString(),
                isStale: false,
                history: { status: 'done', fromOn: null, transactionCount: 10 },
                accounts: [],
                lastRun: null,
                pendingAccountMatches: [
                  {
                    pluggyAccountId: 'pluggy-1',
                    name: 'Conta corrente',
                    type: 'checking',
                    numberHint: '1234',
                    candidates: [
                      {
                        accountId: '0196e2a0-0000-7000-8000-0000000000a1',
                        name: 'Nubank antiga',
                        type: 'checking',
                        source: 'manual',
                      },
                      {
                        accountId: '0196e2a0-0000-7000-8000-0000000000a2',
                        name: 'Nubank velha',
                        type: 'checking',
                        source: 'manual',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        ),
        http.put('/api/sync/connections/:id/account-matches', async ({ request }) => {
          sent = await request.json();
          return HttpResponse.json({}, { status: 202 });
        }),
      );
      const user = createUser();
      await openSettings();

      expect(await screen.findByText('Qual conta já existente é a do Nubank?')).toBeInTheDocument();
      const confirm = screen.getByRole('button', { name: 'Confirmar escolha' });
      expect(confirm).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Nubank velha · Conta corrente' }));
      expect(confirm).toBeEnabled();
      await user.click(confirm);

      await waitFor(() =>
        expect(sent).toEqual({
          matches: [
            { pluggyAccountId: 'pluggy-1', accountId: '0196e2a0-0000-7000-8000-0000000000a2' },
          ],
        }),
      );
    });

    it('sends "outra conta" as a null account', async () => {
      let sent: { matches: { accountId: string | null }[] } | null = null;
      server.use(
        http.get('/api/sync/connections', () =>
          HttpResponse.json({
            items: [
              {
                id: '0196e2a0-0000-7000-8000-000000000001',
                institutionCode: 'nubank',
                institutionName: 'Nubank',
                status: 'active',
                errorCode: null,
                lastBankUpdateAt: null,
                lastSuccessAt: null,
                isStale: false,
                history: { status: 'done', fromOn: null, transactionCount: 0 },
                accounts: [],
                lastRun: null,
                pendingAccountMatches: [
                  {
                    pluggyAccountId: 'pluggy-1',
                    name: 'Conta corrente',
                    type: 'checking',
                    numberHint: null,
                    candidates: [
                      {
                        accountId: '0196e2a0-0000-7000-8000-0000000000a1',
                        name: 'Nubank antiga',
                        type: 'checking',
                        source: 'manual',
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        ),
        http.put('/api/sync/connections/:id/account-matches', async ({ request }) => {
          sent = (await request.json()) as typeof sent;
          return HttpResponse.json({}, { status: 202 });
        }),
      );
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'É outra conta' }));
      await user.click(screen.getByRole('button', { name: 'Confirmar escolha' }));

      await waitFor(() => expect(sent?.matches[0]?.accountId).toBeNull());
    });

    it('shows the empty state when no bank is connected', async () => {
      db.connections = [];
      await openSettings();

      expect(await screen.findByText(/Nenhum banco conectado ainda/)).toBeInTheDocument();
    });

    it('asks for the Pluggy keys on the first configuration and validates them', async () => {
      db.syncSettings = null;
      const user = createUser();
      await openSettings();

      expect(
        await screen.findByRole('list', { name: 'Passos para conectar o Open Finance' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Guardar as chaves' }));
      expect(screen.getByText('Cole o Client ID do Pluggy.')).toBeInTheDocument();
      expect(screen.getByText('Cole o Client Secret do Pluggy.')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText('Client ID')).toHaveFocus());

      await user.type(screen.getByLabelText('Client ID'), 'meu-client-id');
      await user.type(screen.getByLabelText('Client Secret'), 'meu-segredo');
      await user.click(screen.getByRole('button', { name: 'Guardar as chaves' }));

      expect(await screen.findByText('Pluggy conectado')).toBeInTheDocument();
    });

    it('shows the error with "Tentar de novo" and recovers', async () => {
      let fails = true;
      server.use(
        http.get('/api/sync/connections', () =>
          fails
            ? HttpResponse.json({ code: 'UNKNOWN_ERROR', message: 'x' }, { status: 500 })
            : HttpResponse.json({ items: [] }),
        ),
      );
      const user = createUser();
      await openSettings();

      expect(await screen.findByText('Não deu para carregar as conexões.')).toBeInTheDocument();
      fails = false;
      await user.click(screen.getAllByRole('button', { name: 'Tentar de novo' })[0]!);

      expect(await screen.findByText(/Nenhum banco conectado ainda/)).toBeInTheDocument();
    });
  });

  describe('Backup', () => {
    it('shows the folder as plain text and the last backup', async () => {
      await openSettings();

      const path = await screen.findByText('D:\\Backups\\Fincheck');
      expect(path).toHaveClass('font-plain', 'tabular-nums');
      expect(path).not.toHaveClass('font-mono');
      expect(await screen.findByText(/Último backup ontem às 03:00/)).toBeInTheDocument();
      expect(screen.getByText(/Um por dia, os últimos 30 guardados/)).toBeInTheDocument();
    });

    it('changes the folder through a text field that the API checks', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
      const field = screen.getByLabelText('Caminho da pasta');
      expect(field).toHaveValue('D:\\Backups\\Fincheck');
      await user.clear(field);
      await user.type(field, 'E:\\Copias\\Fincheck');
      await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

      expect(await screen.findByText('E:\\Copias\\Fincheck')).toBeInTheDocument();
      expect(screen.queryByLabelText('Caminho da pasta')).not.toBeInTheDocument();
    });

    it('rejects a relative path before sending it', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
      const field = screen.getByLabelText('Caminho da pasta');
      await user.clear(field);
      await user.type(field, 'Backups');
      await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

      expect(await screen.findByText(/Use o caminho completo da pasta/)).toBeInTheDocument();
      await waitFor(() => expect(field).toHaveFocus());
    });

    it('shows the API reason when the folder does not exist', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
      const field = screen.getByLabelText('Caminho da pasta');
      await user.clear(field);
      await user.type(field, 'E:\\Inexistente');
      await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

      expect(await screen.findByText('Essa pasta não existe.')).toBeInTheDocument();
      expect(screen.getByLabelText('Caminho da pasta')).toHaveValue('E:\\Inexistente'); // the form stays open
    });

    it('makes a backup now and shows it as the last one', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Fazer backup agora' }));

      expect(
        await screen.findByText(/Último backup hoje às/, undefined, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fazer backup agora' })).toBeEnabled();
    }, 10_000);

    it('explains what the restore changes, and restores the chosen backup', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Restaurar um backup' }));
      const choose = await screen.findByRole('dialog', { name: 'Restaurar um backup' });
      const options = await within(choose).findAllByRole('button', { name: /às 03:00 · / });
      expect(options.length).toBe(5);
      expect(within(choose).getByRole('button', { name: 'Continuar' })).toBeDisabled();

      await user.click(options[1]!);
      await user.click(within(choose).getByRole('button', { name: 'Continuar' }));

      const confirm = await screen.findByRole('alertdialog');
      expect(
        within(confirm).getByRole('heading', { name: /^Restaurar o backup de \d{2}\/\d{2}\?$/ }),
      ).toBeVisible();
      expect(within(confirm).getByText(/guarda uma cópia do banco/)).toBeInTheDocument();
      expect(within(confirm).getByText(/reabre sozinho/)).toBeInTheDocument();

      await user.click(within(confirm).getByRole('button', { name: 'Restaurar' }));

      expect(
        await screen.findByText(/A cópia de segurança ficou em fincheck-/),
      ).toBeInTheDocument();
      // It waits for /health and then reloads the page.
      await waitFor(() => expect(reloadApp).toHaveBeenCalledTimes(1), { timeout: 4000 });
    }, 10_000);

    it('shows the error and keeps the dialog when the restore fails', async () => {
      server.use(
        http.post('/api/backup/restore', () =>
          HttpResponse.json(
            { code: 'BACKUP_FILE_INVALID', message: 'x', details: { reason: 'corrupt' } },
            { status: 422 },
          ),
        ),
      );
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('button', { name: 'Restaurar um backup' }));
      const choose = await screen.findByRole('dialog', { name: 'Restaurar um backup' });
      await user.click((await within(choose).findAllByRole('button', { name: /às 03:00 · / }))[0]!);
      await user.click(within(choose).getByRole('button', { name: 'Continuar' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restaurar' }),
      );

      expect(await screen.findByText('O arquivo está corrompido.')).toBeInTheDocument();
    });

    it('asks to choose a folder when there is none', async () => {
      db.backup.folderPath = null;
      await openSettings();

      expect(await screen.findByRole('button', { name: 'Escolher pasta' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fazer backup agora' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Restaurar um backup' })).toBeDisabled();
    });

    it('shows the error with "Tentar de novo" when the status does not load', async () => {
      server.use(
        http.get('/api/backup', () =>
          HttpResponse.json({ code: 'UNKNOWN_ERROR', message: 'x' }, { status: 500 }),
        ),
      );
      await openSettings();

      expect(
        await screen.findByText('Não deu para carregar o estado do backup.'),
      ).toBeInTheDocument();
    });
  });

  describe('Aparência', () => {
    it('applies and saves the theme the person picks, "Sistema" included', async () => {
      const user = createUser();
      await openSettings();

      await user.click(await screen.findByRole('radio', { name: 'Escuro' }));
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(window.localStorage.getItem('fincheck:theme')).toBe('dark');

      await user.click(screen.getByRole('radio', { name: 'Claro' }));
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');

      media.setSystemDark(true);
      await user.click(screen.getByRole('radio', { name: 'Sistema' }));
      expect(window.localStorage.getItem('fincheck:theme')).toBeNull();
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    it('opens with "Sistema" selected when nothing was saved', async () => {
      await openSettings();

      expect(await screen.findByRole('radio', { name: 'Sistema' })).toBeChecked();
    });
  });

  describe('layout', () => {
    it('has no side menu on the phone and ends with the notes', async () => {
      await openSettings();

      expect(
        screen.queryByRole('navigation', { name: 'Seções de Configurações' }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Tokens e chaves ficam criptografados neste PC.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ícones Solar, de 480 Design, sob licença CC BY 4.0/),
      ).toBeInTheDocument();
    });

    it('has the side menu with only the list of sections on the desktop, without repeating the title', async () => {
      media.restore();
      media = stubMatchMedia({ desktop: true });
      const user = createUser();
      await openSettings();

      const nav = await screen.findByRole('navigation', { name: 'Seções de Configurações' });
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual([
        expect.stringContaining('Conexões'),
        expect.stringContaining('Backup'),
        expect.stringContaining('Aparência'),
      ]);
      expect(await within(nav).findByText('Pluggy, Bradesco e Nubank')).toBeInTheDocument();
      expect(screen.getAllByText('Configurações')).toHaveLength(1);
      expect(within(nav).getByRole('link', { name: /Conexões/ })).toHaveAttribute(
        'aria-current',
        'page',
      );

      await user.click(within(nav).getByRole('link', { name: /Backup/ }));

      expect(window.location.pathname).toBe('/settings');
      expect(window.location.hash).toBe('#backup');
      expect(within(nav).getByRole('link', { name: /Backup/ })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(scrollIntoView).toHaveBeenCalled();
    });

    it('opens on the section named in the URL hash', async () => {
      media.restore();
      media = stubMatchMedia({ desktop: true });
      window.history.replaceState({}, '', '/settings#appearance');
      renderApp('/settings#appearance');

      const nav = await screen.findByRole('navigation', { name: 'Seções de Configurações' });
      expect(within(nav).getByRole('link', { name: /Aparência/ })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('is reached by the gear and marks no tab', async () => {
      renderApp('/');
      fireEvent.click(await screen.findByRole('link', { name: /Configurações/ }));

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
      ).toBeInTheDocument();
    });
  });
});
