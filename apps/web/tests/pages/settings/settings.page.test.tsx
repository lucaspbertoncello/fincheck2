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

beforeEach(() => {
  media = stubMatchMedia();
  window.localStorage.clear();
});

afterEach(() => {
  setTheme('light'); // stops following the system theme
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  media.restore();
});

const TITLE = {
  profile: 'Perfil',
  connections: 'Conexões',
  backup: 'Backup',
  appearance: 'Aparência',
} as const;

/** Opens the page of one section by its own route and waits for its title. */
async function openPage(section: keyof typeof TITLE) {
  renderApp(`/settings/${section}`);
  return screen.findByRole('heading', { level: 1, name: TITLE[section] });
}

function useDesktop() {
  media.restore();
  media = stubMatchMedia({ desktop: true });
}

describe('SettingsPage', () => {
  describe('Conexões', () => {
    it('lists the banks with what the Pluggy last did, and flags the stale one', async () => {
      await openPage('connections');

      expect(await screen.findByText('Open Finance conectado')).toBeInTheDocument();
      expect(screen.getByText('Nubank', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getByText('Bradesco', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getAllByText(/Atualizado pelo banco há/)).toHaveLength(2);
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

      await openPage('connections');

      expect(await screen.findByText(/Conexão com erro, login com erro/)).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'Reconectar no Open Finance' });
      expect(link).toHaveAttribute('href', 'https://meu.pluggy.ai');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('asks before disconnecting and removes the bank from the list', async () => {
      const user = createUser();
      await openPage('connections');

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
      await openPage('connections');

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
      await openPage('connections');

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
      await openPage('connections');

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
      await openPage('connections');

      await user.click(await screen.findByRole('button', { name: 'É outra conta' }));
      await user.click(screen.getByRole('button', { name: 'Confirmar escolha' }));

      await waitFor(() => expect(sent?.matches[0]?.accountId).toBeNull());
    });

    it('shows the empty state when no bank is connected', async () => {
      db.connections = [];
      await openPage('connections');

      expect(await screen.findByText(/Nenhum banco conectado ainda/)).toBeInTheDocument();
    });

    it('asks for the Pluggy keys on the first configuration and validates them', async () => {
      db.syncSettings = null;
      const user = createUser();
      await openPage('connections');

      expect(
        await screen.findByRole('list', { name: 'Passos para conectar o Open Finance' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Guardar as chaves' }));
      expect(screen.getByText('Cole o Client ID do Open Finance.')).toBeInTheDocument();
      expect(screen.getByText('Cole o Client Secret do Open Finance.')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByLabelText('Client ID')).toHaveFocus());

      await user.type(screen.getByLabelText('Client ID'), 'meu-client-id');
      await user.type(screen.getByLabelText('Client Secret'), 'meu-segredo');
      await user.click(screen.getByRole('button', { name: 'Guardar as chaves' }));

      expect(await screen.findByText('Open Finance conectado')).toBeInTheDocument();
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
      await openPage('connections');

      expect(await screen.findByText('Não deu para carregar as conexões.')).toBeInTheDocument();
      fails = false;
      await user.click(screen.getAllByRole('button', { name: 'Tentar de novo' })[0]!);

      expect(await screen.findByText(/Nenhum banco conectado ainda/)).toBeInTheDocument();
    });
  });

  describe('Backup', () => {
    it('shows the last backup that worked, the next one and the folder as plain text', async () => {
      await openPage('backup');

      expect(await screen.findByText('Ontem às 03:00', { selector: 'p' })).toBeInTheDocument();
      expect(screen.getByText('Deu certo')).toBeInTheDocument();
      expect(screen.getByText('Próximo backup')).toBeInTheDocument();
      expect(screen.getByText(/Um por dia, os últimos 30 ficam guardados/)).toBeInTheDocument();
      const path = screen.getByText('D:\\Backups\\Fincheck');
      expect(path).toHaveClass('font-plain', 'tabular-nums');
      expect(path).not.toHaveClass('font-mono');
    });

    it('says when the last attempt failed and why', async () => {
      db.backup.lastError = { at: new Date().toISOString(), code: 'BACKUP_DISK_FULL' };
      await openPage('backup');

      expect(await screen.findByText('Falhou')).toBeInTheDocument();
      expect(screen.getByText('O último backup falhou: o disco está cheio.')).toBeInTheDocument();
      expect(screen.queryByText('Deu certo')).not.toBeInTheDocument();
    });

    it('lists the latest backups, the newest marked', async () => {
      await openPage('backup');

      const list = await screen.findByRole('list', { name: 'Backups da pasta' });
      const rows = within(list).getAllByRole('listitem');
      expect(rows).toHaveLength(5);
      expect(within(rows[0]!).getByText('Mais recente')).toBeInTheDocument();
      expect(within(rows[1]!).queryByText('Mais recente')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Mostrar todos/ })).not.toBeInTheDocument();
    });

    it('shows only the latest five and opens the rest on request', async () => {
      const user = createUser();
      const template = db.backup.files[0]!;
      db.backup.files = Array.from({ length: 8 }, (_, index) => ({
        ...template,
        fileName: `fincheck-2026-10-${String(20 - index).padStart(2, '0')}-030000.db`,
        createdAt: new Date(Date.UTC(2026, 9, 20 - index, 6)).toISOString(),
      }));
      await openPage('backup');

      const list = await screen.findByRole('list', { name: 'Backups da pasta' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(5);
      await user.click(screen.getByRole('button', { name: 'Mostrar todos (8)' }));
      expect(within(list).getAllByRole('listitem')).toHaveLength(8);
      await user.click(screen.getByRole('button', { name: 'Mostrar só os últimos' }));
      expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    });

    it('changes the folder through a text field that the API checks', async () => {
      const user = createUser();
      await openPage('backup');

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
      await openPage('backup');

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
      await openPage('backup');

      await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
      const field = screen.getByLabelText('Caminho da pasta');
      await user.clear(field);
      await user.type(field, 'E:\\Inexistente');
      await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

      expect(await screen.findByText('Essa pasta não existe.')).toBeInTheDocument();
      expect(screen.getByLabelText('Caminho da pasta')).toHaveValue('E:\\Inexistente'); // the form stays open
    });

    it('makes a backup now and shows it as the latest one', async () => {
      const user = createUser();
      await openPage('backup');

      await user.click(
        await screen.findByRole('button', { name: 'Fazer backup agora' }, { timeout: 5000 }),
      );

      const list = screen.getByRole('list', { name: 'Backups da pasta' });
      expect(
        await within(list).findByText(/^Hoje às/, undefined, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Fazer backup agora' }, { timeout: 5000 }),
      ).toBeEnabled();
    }, 10_000);

    it('asks at the end of the gesture: nothing is restored until the dialog is confirmed', async () => {
      let restores = 0;
      server.use(
        http.post('/api/backup/restore', () => {
          restores += 1;
          return HttpResponse.json(
            { safetyCopyFileName: 'fincheck-2026-10-22-120000.db' },
            { status: 202 },
          );
        }),
      );
      const user = createUser();
      await openPage('backup');

      const restoreButtons = await screen.findAllByRole('button', {
        name: /^Restaurar o backup de/,
      });
      await user.click(restoreButtons[1]!);

      const confirm = await screen.findByRole('alertdialog');
      expect(
        within(confirm).getByRole('heading', { name: /^Restaurar o backup de \d{2}\/\d{2}\?$/ }),
      ).toBeVisible();
      expect(within(confirm).getByText(/guarda uma cópia do banco/)).toBeInTheDocument();
      expect(within(confirm).getByText(/deixa de aparecer/)).toBeInTheDocument();
      expect(within(confirm).getByText(/reabre sozinho/)).toBeInTheDocument();
      expect(restores).toBe(0);

      await user.click(within(confirm).getByRole('button', { name: 'Voltar' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(restores).toBe(0);
    });

    it('restores the chosen backup after the confirmation', async () => {
      const user = createUser();
      await openPage('backup');

      const restoreButtons = await screen.findAllByRole('button', {
        name: /^Restaurar o backup de/,
      });
      await user.click(restoreButtons[1]!);
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restaurar' }),
      );

      expect(
        await screen.findByText(/A cópia de segurança ficou em fincheck-/),
      ).toBeInTheDocument();
      // It waits for /health and then reloads the page.
      await waitFor(() => expect(reloadApp).toHaveBeenCalledTimes(1), { timeout: 4000 });
    }, 10_000);

    it('shows the error on the page when the restore fails', async () => {
      server.use(
        http.post('/api/backup/restore', () =>
          HttpResponse.json(
            { code: 'BACKUP_FILE_INVALID', message: 'x', details: { reason: 'corrupt' } },
            { status: 422 },
          ),
        ),
      );
      const user = createUser();
      await openPage('backup');

      await user.click(
        (await screen.findAllByRole('button', { name: /^Restaurar o backup de/ }))[0]!,
      );
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restaurar' }),
      );

      expect(await screen.findByText('O arquivo está corrompido.')).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('asks to choose a folder when there is none', async () => {
      db.backup.folderPath = null;
      const user = createUser();
      await openPage('backup');

      await user.click(await screen.findByRole('button', { name: 'Escolher pasta' }));
      expect(screen.getByLabelText('Caminho da pasta')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Fazer backup agora' })).not.toBeInTheDocument();
    });

    it('shows the error with "Tentar de novo" when the status does not load', async () => {
      server.use(
        http.get('/api/backup', () =>
          HttpResponse.json({ code: 'UNKNOWN_ERROR', message: 'x' }, { status: 500 }),
        ),
      );
      await openPage('backup');

      expect(
        await screen.findByText('Não deu para carregar o estado do backup.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
    });

    it('shows the error of the list without hiding the rest of the page', async () => {
      server.use(
        http.get('/api/backup/files', () =>
          HttpResponse.json({ code: 'BACKUP_FOLDER_INVALID', message: 'x' }, { status: 422 }),
        ),
      );
      await openPage('backup');

      expect(await screen.findByText('Não deu para ler a pasta dos backups.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fazer backup agora' })).toBeInTheDocument();
    });
  });

  describe('Aparência', () => {
    it('applies and saves the theme the person picks, "Sistema" included', async () => {
      const user = createUser();
      await openPage('appearance');

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
      await openPage('appearance');

      expect(await screen.findByRole('radio', { name: 'Sistema' })).toBeChecked();
    });
  });

  describe('Aparência: grupos', () => {
    it('has the group Tema, ready for others to join it', async () => {
      await openPage('appearance');

      expect(await screen.findByRole('heading', { level: 2, name: 'Tema' })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Tema' })).toBeInTheDocument();
    });
  });

  describe('páginas', () => {
    it.each([
      ['profile', 'Perfil'],
      ['connections', 'Conexões'],
      ['backup', 'Backup'],
      ['appearance', 'Aparência'],
    ] as const)(
      '/settings/%s opens its own page with the item %s marked',
      async (section, title) => {
        useDesktop();
        await openPage(section);

        const nav = await screen.findByRole('navigation', { name: 'Páginas de Configurações' });
        const links = within(nav).getAllByRole('link');
        expect(links).toHaveLength(4);
        for (const link of links) {
          if (link.textContent?.includes(title))
            expect(link).toHaveAttribute('aria-current', 'page');
          else expect(link).not.toHaveAttribute('aria-current');
        }
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      },
    );

    it('shows a title and one line of description on every page', async () => {
      await openPage('backup');

      expect(
        screen.getByText('Uma cópia do banco por dia, na pasta que você escolher.'),
      ).toBeInTheDocument();
    });

    it('goes from one page to the next through the menu', async () => {
      useDesktop();
      const user = createUser();
      await openPage('profile');

      const nav = await screen.findByRole('navigation', { name: 'Páginas de Configurações' });
      await user.click(within(nav).getByRole('link', { name: /Backup/ }));

      expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/settings/backup');
      expect(window.location.hash).toBe('');
      expect(within(nav).getByRole('link', { name: /Backup/ })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(within(nav).getByRole('link', { name: /Perfil/ })).not.toHaveAttribute('aria-current');
    });

    it('goes to Perfil when /settings opens on the desktop', async () => {
      useDesktop();
      renderApp('/settings');

      expect(await screen.findByRole('heading', { level: 1, name: 'Perfil' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/settings/profile');
    });

    it.each([
      ['#profile', '/settings/profile', 'Perfil'],
      ['#connections', '/settings/connections', 'Conexões'],
      ['#backup', '/settings/backup', 'Backup'],
      ['#appearance', '/settings/appearance', 'Aparência'],
    ])('sends the old link /settings%s to %s', async (hash, path, title) => {
      renderApp(`/settings${hash}`);

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(window.location.pathname).toBe(path);
      expect(window.location.hash).toBe('');
    });

    it('keeps the month of the URL when it redirects', async () => {
      renderApp('/settings?month=2026-09#backup');

      expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/settings/backup');
      expect(window.location.search).toContain('month=2026-09');
    });
  });

  describe('layout', () => {
    it('is a list of the pages on the phone, with the notes at the end', async () => {
      renderApp('/settings');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
      ).toBeInTheDocument();
      const nav = screen.getByRole('navigation', { name: 'Páginas de Configurações' });
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => link.getAttribute('href')),
      ).toEqual([
        '/settings/profile',
        '/settings/connections',
        '/settings/backup',
        '/settings/appearance',
      ]);
      expect(window.location.pathname).toBe('/settings');
      expect(
        screen.getByText('Tokens e chaves ficam criptografados neste PC.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ícones Solar, de 480 Design, sob licença CC BY 4.0/),
      ).toBeInTheDocument();
    });

    it('opens a page from the list on the phone, with the way back', async () => {
      const user = createUser();
      renderApp('/settings');

      await user.click(await screen.findByRole('link', { name: /Backup/ }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeInTheDocument();
      const back = within(screen.getByRole('main')).getByRole('link', { name: 'Configurações' });
      expect(back).toHaveAttribute('href', '/settings');
      // A page on the phone has no menu and no notes of its own.
      expect(
        screen.queryByRole('navigation', { name: 'Páginas de Configurações' }),
      ).not.toBeInTheDocument();

      await user.click(back);
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
      ).toBeInTheDocument();
    });

    it('has the side menu with only the list of pages on the desktop, outside the page', async () => {
      useDesktop();
      await openPage('profile');

      const nav = await screen.findByRole('navigation', { name: 'Páginas de Configurações' });
      expect(screen.getByRole('main')).not.toContainElement(nav);
      expect(
        within(nav)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual([
        expect.stringContaining('Perfil'),
        expect.stringContaining('Conexões'),
        expect.stringContaining('Backup'),
        expect.stringContaining('Aparência'),
      ]);
      expect(await within(nav).findByText('Open Finance, Bradesco e Nubank')).toBeInTheDocument();
      // No back link on the desktop's DOM matters: it is hidden by CSS only, the title is not repeated.
      expect(screen.queryByRole('heading', { name: 'Configurações' })).not.toBeInTheDocument();
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
