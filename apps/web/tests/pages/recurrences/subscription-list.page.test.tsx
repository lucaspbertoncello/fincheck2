import { listSubscriptionsResponseSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse, delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const URL = `/recurrences/subscriptions?month=${CURRENT_MONTH}`;
const LOAD_TIMEOUT = 4000;

beforeEach(() => hideValuesStore.set(false));
afterEach(() => hideValuesStore.set(false));

// The button that opens a subscription is named "Abrir <name>"; its row is the closest grid, inside the list item.
async function findRow(name: string): Promise<HTMLElement> {
  const button = await screen.findByRole(
    'button',
    { name: `Abrir ${name}` },
    { timeout: LOAD_TIMEOUT },
  );
  const row = button.closest<HTMLElement>('[class*="grid-cols-"]');
  if (!row) throw new Error(`No row for ${name}`);

  return row;
}

// A folded block is `inert`: it is still in the DOM until its transition ends, but out of reach.
function isFolded(element: HTMLElement): boolean {
  return element.closest('[inert]') !== null;
}

async function suggestionBanner(name: string): Promise<HTMLElement> {
  const text = await screen.findByText(new RegExp(`Parece uma assinatura: ${name}`));
  const banner = text.closest('[role="status"]');
  if (!(banner instanceof HTMLElement)) throw new Error(`No banner for ${name}`);

  return banner;
}

describe('SubscriptionListPage', () => {
  it('shows the totals of the active ones, by month and by year', async () => {
    renderApp(URL);
    await findRow('Netflix');

    const monthly = 4490 + 2190 + 1990 + 7900 + 4590 + 3990;
    expect(screen.getByText('Por mês')).toBeInTheDocument();
    expect(screen.getByText('6 assinaturas ativas')).toBeInTheDocument();
    expect(screen.getByText('Por ano')).toBeInTheDocument();
    const format = (cents: number) =>
      new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(cents / 100);
    expect(screen.getAllByText(format(monthly)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(format(monthly * 12)).length).toBeGreaterThan(0);
  });

  it('shows the logo of the services it recognizes, in the banner too, and the icon of the others', async () => {
    renderApp(URL);

    const netflix = await findRow('Netflix');
    const spotify = await findRow('Spotify');
    const nuvem = await findRow('Nuvem+ 200 GB');
    const banner = await suggestionBanner('Deezer Premium');

    expect(netflix.querySelector('[data-service="netflix"]')).not.toBeNull();
    expect(spotify.querySelector('[data-service="spotify"]')).not.toBeNull();
    expect(banner.querySelector('[data-service="deezer"]')).not.toBeNull();
    expect(nuvem.querySelector('[data-service]')).toBeNull();
    expect(nuvem.querySelector('[data-type="expense"]')).not.toBeNull();
    // "Outro" subscriptions keep the category icon, never an initial.
    for (const name of ['Clube do livro', 'Ioga em casa']) {
      expect((await findRow(name)).querySelector('[data-service]')).toBeNull();
    }
  });

  it('lists each subscription with the card, the day and the state of the month', async () => {
    renderApp(URL);

    const streamflix = await findRow('Netflix');
    expect(within(streamflix).getByText('Cobrada')).toBeInTheDocument();
    expect(within(streamflix).getByText(/^Roxinho · dia \d+$/)).toBeInTheDocument();
    expect(within(await findRow('Clube do livro')).getByText('Cobrada')).toBeInTheDocument();
    expect(within(await findRow('Ioga em casa')).getByText('Cobrada')).toBeInTheDocument();
    expect(within(await findRow('Nuvem+ 200 GB')).getByText('Não cobrou')).toBeInTheDocument();
    // Never more than two chips: the ended one has its state and "Encerrada".
    const revista = await findRow('Revista Digital');
    expect(within(revista).getByText('Encerrada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Encerradas que cobraram' })).toBeInTheDocument();
  });

  it('warns on the row: price that went up, charge that did not come, charge after the end', async () => {
    renderApp(URL);

    const musicando = await findRow('Spotify');
    expect(within(musicando).getByText('Subiu de R$ 21,90 para R$ 24,90')).toBeInTheDocument();
    expect(within(musicando).getByRole('button', { name: 'Atualizar valor' })).toBeInTheDocument();
    const nuvem = await findRow('Nuvem+ 200 GB');
    expect(within(nuvem).getByText('Não cobrou este mês. Cancelou?')).toBeInTheDocument();
    expect(within(nuvem).getByRole('button', { name: 'Encerrar' })).toBeInTheDocument();
    const revista = await findRow('Revista Digital');
    expect(
      within(revista).getByText('Revista Digital cobrou R$ 34,90 depois de encerrada'),
    ).toBeInTheDocument();
    // No warning, no button, on a subscription that behaved.
    expect(within(await findRow('Netflix')).queryByRole('button', { name: 'Encerrar' })).toBeNull();
  });

  it('hides the values with the eye, also inside the sentences', async () => {
    hideValuesStore.set(true);
    renderApp(URL);

    const musicando = await findRow('Spotify');

    expect(within(musicando).queryByText(/21,90/)).toBeNull();
    expect(within(musicando).getByText(/Subiu de R\$ ••,•• para R\$ ••,••/)).toBeInTheDocument();
  });

  it('"Atualizar valor" sets the expected amount to the last charge, with an undo', async () => {
    renderApp(URL);
    const musicando = await findRow('Spotify');

    fireEvent.click(within(musicando).getByRole('button', { name: 'Atualizar valor' }));

    expect(await screen.findByText('Spotify agora é R$ 24,90.')).toBeInTheDocument();
    await waitFor(() => expect(isFolded(within(musicando).getByText(/Subiu de/))).toBe(true));
    const after = listSubscriptionsResponseSchema.parse(
      (await callApi('GET', `/subscriptions?month=${CURRENT_MONTH}`)).json,
    );
    expect(after.items.find((item) => item.recurrence.name === 'Spotify')).toMatchObject({
      alert: null,
      recurrence: { expectedAmountCents: 2490 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(isFolded(within(musicando).getByText(/Subiu de/))).toBe(false));
  });

  it('"Encerrar" ends it, takes it out of the totals and can be undone', async () => {
    renderApp(URL);
    const nuvem = await findRow('Nuvem+ 200 GB');

    fireEvent.click(within(nuvem).getByRole('button', { name: 'Encerrar' }));

    expect(await screen.findByText(/Nuvem\+ 200 GB encerrada/)).toBeInTheDocument();
    await waitFor(() => expect(isFolded(nuvem)).toBe(true));
    expect(await screen.findByText('5 assinaturas ativas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    await waitFor(() => expect(isFolded(nuvem)).toBe(false));
    expect(await screen.findByText('6 assinaturas ativas')).toBeInTheDocument();
  });

  it('"Encerrar" is also in the "…" menu, next to "Editar" and "Excluir"', async () => {
    renderApp(URL);
    const streamflix = await findRow('Netflix');

    fireEvent.click(within(streamflix).getByRole('button', { name: 'Ações de Netflix' }));

    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Encerrar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('opens the recurrence in the edit modal of Recorrências when the row is pressed', async () => {
    renderApp(URL);
    const streamflix = await findRow('Netflix');
    const id = db.recurrences.find((item) => item.name === 'Netflix')?.id;

    fireEvent.click(within(streamflix).getByRole('button', { name: 'Abrir Netflix' }));

    expect(await screen.findByRole('dialog', { name: 'Editar recorrência' })).toBeInTheDocument();
    expect(window.location.search).toContain(`edit=${id}`);
    expect(window.location.search).toContain(`month=${CURRENT_MONTH}`);
  });

  describe('suggestions', () => {
    it('says it as "Parece uma assinatura: nome, valor" with the two answers', async () => {
      renderApp(URL);

      const banner = await suggestionBanner('Deezer Premium');

      expect(within(banner).getByText(/Deezer Premium, R\$ 19,90/)).toBeInTheDocument();
      expect(within(banner).getByText(/3 meses seguidos no Roxinho/)).toBeInTheDocument();
      expect(within(banner).getByRole('button', { name: 'Acompanhar' })).toBeInTheDocument();
      expect(within(banner).getByRole('button', { name: 'Agora não' })).toBeInTheDocument();
    });

    it('"Acompanhar" creates the subscription, folds the suggestion and offers the undo', async () => {
      renderApp(URL);
      const banner = await suggestionBanner('Deezer Premium');

      fireEvent.click(within(banner).getByRole('button', { name: 'Acompanhar' }));

      expect(await screen.findByText('Deezer Premium agora é acompanhada.')).toBeInTheDocument();
      await waitFor(() => expect(isFolded(banner)).toBe(true));
      expect(await findRow('Deezer Premium')).toBeInTheDocument();
      expect(db.recurrences.some((item) => item.name === 'Deezer Premium')).toBe(true);

      // The undo deletes the recurrence it created, and the suggestion comes back.
      fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
      await waitFor(() => expect(isFolded(banner)).toBe(false));
      expect(
        db.recurrences.find((item) => item.name === 'Deezer Premium')?.archivedAt,
      ).not.toBeNull();
    });

    it('"Agora não" folds it and, undone, only opens it again: nothing was sent', async () => {
      renderApp(URL);
      const banner = await suggestionBanner('Deezer Premium');

      fireEvent.click(within(banner).getByRole('button', { name: 'Agora não' }));

      expect(await screen.findByText(/Deezer Premium dispensada/)).toBeInTheDocument();
      await waitFor(() => expect(isFolded(banner)).toBe(true));
      expect(db.subscriptionDismissals).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
      await waitFor(() => expect(isFolded(banner)).toBe(false));
      expect(db.subscriptionDismissals).toEqual([]);
    });

    it('"Agora não" is sent when the toast closes without the undo', async () => {
      renderApp(URL);
      const banner = await suggestionBanner('Deezer Premium');

      fireEvent.click(within(banner).getByRole('button', { name: 'Agora não' }));

      // The toast stays 6 s; the dismissal goes out when it leaves.
      await waitFor(() => expect(db.subscriptionDismissals).toHaveLength(1), { timeout: 9000 });
      expect(isFolded(banner)).toBe(true);
    }, 15_000);
  });

  describe('states', () => {
    it('shows a skeleton the size of the screen while it loads', async () => {
      server.use(
        http.get('/api/subscriptions', async () => {
          await delay('infinite');

          return HttpResponse.json({});
        }),
      );
      renderApp(URL);

      expect(await screen.findByText('Carregando')).toBeInTheDocument();
      expect(screen.getByText('Carregando').closest('[aria-busy="true"]')).not.toBeNull();
    });

    it('shows the empty state with the way to register one', async () => {
      server.use(
        http.get('/api/subscriptions', () =>
          HttpResponse.json({
            summary: { activeCount: 0, monthlyTotalCents: 0, yearlyTotalCents: 0 },
            items: [],
            suggestions: [],
          }),
        ),
      );
      renderApp(URL);

      expect(await screen.findByText('Nenhuma assinatura ainda')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Cadastrar assinatura' }));

      const dialog = await screen.findByRole('dialog', { name: 'Nova recorrência' });
      expect(window.location.search).toContain('new=subscription');
      // Already an expense on the card: the first credit card of the list comes chosen.
      expect(within(dialog).getByRole('radio', { name: 'Despesa' })).toBeChecked();
      await waitFor(() =>
        expect(within(dialog).getByRole('radio', { name: /Bradesco Black/ })).toBeChecked(),
      );
    });

    it('shows the error and tries again', async () => {
      let calls = 0;
      server.use(
        http.get('/api/subscriptions', () => {
          calls += 1;

          return HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 });
        }),
      );
      renderApp(URL);

      expect(await screen.findByText('Não deu para carregar as assinaturas')).toBeInTheDocument();
      const before = calls;
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

      await waitFor(() => expect(calls).toBeGreaterThan(before));
    });
  });

  it('is the third tab of Recorrentes, after "A pagar e receber" and before "Amigos"', async () => {
    renderApp(URL);
    await findRow('Netflix');

    const nav = screen.getByRole('navigation', { name: 'Seções de Recorrentes' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'Recorrências',
      'A pagar e receber',
      'Assinaturas',
      'Amigos',
    ]);
    expect(links[2]).toHaveAttribute('aria-current', 'page');
    expect(links[2]).toHaveAttribute('href', expect.stringContaining('/recurrences/subscriptions'));
  });
});
