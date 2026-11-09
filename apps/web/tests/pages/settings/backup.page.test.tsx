import { configure, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadApp } from '#/shared/utils/reload-app.util.ts';
import { setThemePreference } from '#/shared/stores/theme.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { createUser } from '#tests/support/interaction/create-user.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

vi.mock('#/shared/utils/reload-app.util.ts', () => ({ reloadApp: vi.fn() }));

resetDatabaseBeforeEach();

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

let media: ReturnType<typeof stubMatchMedia>;

beforeEach(() => {
  media = stubMatchMedia();
  window.localStorage.clear();
  vi.mocked(reloadApp).mockClear();
});

afterEach(() => {
  setThemePreference('light');
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  media.restore();
});

async function openData() {
  renderApp('/settings/data');
  return screen.findByRole('heading', { level: 1, name: 'Dados' });
}

async function confirmRestoreOfNewest(user: ReturnType<typeof createUser>) {
  await user.click((await screen.findAllByRole('button', { name: /^Restaurar o backup de/ }))[1]!);
  await user.click(
    within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Restaurar' }),
  );
}

describe('Dados against the API', () => {
  it('says that nothing was restored when the last restore failed after the 202', async () => {
    db.backup.lastError = { at: new Date().toISOString(), code: 'RESTORE_FAILED' };
    await openData();

    expect(await screen.findByText('Falhou')).toBeInTheDocument();
    expect(
      screen.getByText('A restauração falhou e nada foi restaurado: o banco continua o de antes.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Deu certo')).not.toBeInTheDocument();
  });

  it('stays on the page and shows the failure when the swap failed, without reloading', async () => {
    server.use(
      http.post('/api/backup/restore', () => {
        db.backup.lastError = { at: new Date().toISOString(), code: 'RESTORE_FAILED' };

        return HttpResponse.json(
          { safetyCopyFileName: 'fincheck-2026-10-22-120000.db' },
          { status: 202 },
        );
      }),
    );
    const user = createUser();
    await openData();

    await confirmRestoreOfNewest(user);

    expect(
      await screen.findByText(
        'A restauração falhou e nada foi restaurado: o banco continua o de antes.',
        undefined,
        { timeout: 6000 },
      ),
    ).toBeInTheDocument();
    expect(reloadApp).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fazer backup agora' })).toBeEnabled(),
    );
  });

  it('locks the page while it waits for the API to come back from the swap', async () => {
    let healthReads = 0;
    server.use(
      http.get('/api/health', () => {
        healthReads += 1;

        return HttpResponse.json(
          healthReads < 2
            ? { status: 'degraded', database: 'unavailable' }
            : { status: 'ok', database: 'ok' },
        );
      }),
    );
    const user = createUser();
    await openData();

    await confirmRestoreOfNewest(user);

    await waitFor(() => expect(healthReads).toBeGreaterThanOrEqual(1));
    expect(screen.getByRole('button', { name: /Fazendo backup/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    for (const button of screen.getAllByRole('button', { name: /^Restaurar o backup de/ })) {
      expect(button.hasAttribute('data-disabled') || button.hasAttribute('disabled')).toBe(true);
    }
    await waitFor(() => expect(reloadApp).toHaveBeenCalledTimes(1), { timeout: 6000 });
  });

  it('shows the Portuguese sentence, never the raw text, when the API answers 400 to the folder', async () => {
    server.use(
      http.put('/api/backup/settings', () =>
        HttpResponse.json(
          { code: 'VALIDATION_FAILED', message: 'folderPath: Invalid string' },
          { status: 400 },
        ),
      ),
    );
    const user = createUser();
    await openData();

    await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
    const field = screen.getByLabelText('Caminho da pasta');
    await user.clear(field);
    await user.type(field, 'E:\\Copias');
    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

    expect(await screen.findByText(/Use o caminho completo da pasta/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid string/)).not.toBeInTheDocument();
  });

  it('shows the reason of a folder the API refused as not a folder', async () => {
    const user = createUser();
    await openData();

    await user.click(await screen.findByRole('button', { name: 'Trocar pasta' }));
    const field = screen.getByLabelText('Caminho da pasta');
    await user.clear(field);
    await user.type(field, 'E:\\Copias\\arquivo.txt');
    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

    expect(await screen.findByText('Esse caminho não é uma pasta.')).toBeInTheDocument();
  });
});
