import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

resetDatabaseBeforeEach();

let media: ReturnType<typeof stubMatchMedia>;

beforeEach(() => {
  media = stubMatchMedia({ desktop: true });
  window.localStorage.clear();
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
  media.restore();
});

async function openProfile() {
  renderApp('/profile');
  return screen.findByRole('heading', { level: 1, name: 'Perfil' });
}

describe('Perfil', () => {
  it('is a screen of its own with the balance panel beside it, and shows the name, the initials and the expected income', async () => {
    await openProfile();

    expect(screen.getByText('Sua renda, seus gastos e algumas curiosidades.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Páginas de Configurações' })).toBeNull();
    expect(await screen.findByRole('region', { name: 'Saldo em contas' })).toBeInTheDocument();
    expect(await screen.findByText('Davi Moreira', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('DM')).toBeInTheDocument();
    expect(screen.getByText('de renda mensal esperada')).toBeInTheDocument();
  });

  it('lists every income recurrence as a source, with its regime', async () => {
    await openProfile();

    const incomes = db.recurrences.filter(
      (item) => item.kind === 'income' && !item.pausedAt && !item.archivedAt,
    );
    expect(incomes.length).toBeGreaterThan(0);
    const income = incomes[0]!;
    expect(
      await screen.findByRole('button', { name: `Editar ${income.name}` }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Ações de / }).length).toBeGreaterThanOrEqual(
      incomes.length,
    );
  });

  it('adds a source through the recurrence modal, with no form of its own', async () => {
    const user = userEvent.setup();
    await openProfile();

    await user.click(await screen.findByRole('button', { name: 'Adicionar fonte' }));
    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('new=recurrence');
  });

  it('changes the name and the initials follow it', async () => {
    const user = userEvent.setup();
    await openProfile();

    await user.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Editar perfil' });
    const name = within(dialog).getByLabelText(/Nome/);
    await user.clear(name);
    await user.type(name, 'Lucas Bertoncello');
    expect(within(dialog).getAllByText('LB').length).toBeGreaterThan(0); // live preview and the initials option

    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Lucas Bertoncello', { selector: 'p' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('LB')).toBeInTheDocument();
  });

  it('chooses an illustrated avatar, saves it in the PUT and shows it in the header', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && new URL(request.url).pathname === '/api/profile') {
        bodies.push(await request.clone().json());
      }
    });
    await openProfile();

    await user.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Editar perfil' });
    expect(within(dialog).getByRole('radio', { name: 'Usar iniciais' })).toBeChecked();
    expect(within(dialog).getAllByRole('radio')).toHaveLength(13);

    await user.click(within(dialog).getByRole('radio', { name: 'Avatar 3' }));
    expect(within(dialog).getByRole('radio', { name: 'Avatar 3' })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument(),
    );
    expect(bodies).toEqual([{ name: 'Davi Moreira', avatarId: 'notionists-03' }]);
    expect(db.profile.avatarId).toBe('notionists-03');
    expect(screen.queryByText('DM')).toBeNull();
    server.events.removeAllListeners('request:start');
  });

  it('goes back to the initials with "Usar iniciais", sending null', async () => {
    const user = userEvent.setup();
    db.profile.avatarId = 'notionists-07';
    const bodies: unknown[] = [];
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && new URL(request.url).pathname === '/api/profile') {
        bodies.push(await request.clone().json());
      }
    });
    await openProfile();

    await user.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Editar perfil' });
    expect(within(dialog).getByRole('radio', { name: 'Avatar 7' })).toBeChecked();

    await user.click(within(dialog).getByRole('radio', { name: 'Usar iniciais' }));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toEqual([{ name: 'Davi Moreira', avatarId: null }]));
    expect(db.profile.avatarId).toBeNull();
    expect(await screen.findByText('DM')).toBeInTheDocument();
    server.events.removeAllListeners('request:start');
  });

  it('asks for a name before saving', async () => {
    const user = userEvent.setup();
    await openProfile();

    await user.click((await screen.findAllByRole('button', { name: 'Editar' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Editar perfil' });
    await user.clear(within(dialog).getByLabelText(/Nome/));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialog).findByText('Escreva como quer ser chamado')).toBeInTheDocument();
  });
});

describe('Perfil: editar fonte', () => {
  it('opens the recurrence being edited', async () => {
    const user = userEvent.setup();
    await openProfile();
    const income = db.recurrences.find(
      (item) => item.kind === 'income' && !item.pausedAt && !item.archivedAt,
    )!;

    // The name of the source is the button that edits it (there is no "Editar" beside the amount).
    await user.click(await screen.findByRole('button', { name: `Editar ${income.name}` }));

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('edit=');
  });
});

describe('Mapa de gastos', () => {
  async function openMap(name = 'Gasto por dia em 2026') {
    await openProfile();
    return screen.findByRole('grid', { name });
  }

  const asked = vi.fn();

  function watchRequests() {
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/dashboard/spend-heatmap') asked(url.search);
    });
  }

  afterEach(() => {
    server.events.removeAllListeners('request:start');
    asked.mockReset();
  });

  it('opens on the current year: January to December, a named button per day up to today', async () => {
    watchRequests();
    const grid = await openMap();

    const days = within(grid).getAllByRole('button');
    // 1 January to 22 October (the clock of the tests): 295 days; the rest of the year is outlines.
    expect(days).toHaveLength(295);
    expect(days.filter((day) => day.tabIndex === 0)).toHaveLength(1);
    expect(
      within(grid).getByRole('button', { name: /, quinta-feira, 22 de outubro$/ }),
    ).toBeInTheDocument();
    expect(
      within(grid).queryByRole('button', { name: /, sexta-feira, 23 de outubro$/ }),
    ).toBeNull();
    expect(days[0]).toHaveAccessibleName(/^(Sem gastos|R\$ )/);
    expect(asked).toHaveBeenCalledWith('?from=2026-01-01&to=2026-12-31');
    expect(screen.getByRole('heading', { level: 2, name: 'Mapa de gastos' })).toBeInTheDocument();
  });

  it('writes the summary and the scale in words, counting only the days that have come', async () => {
    await openMap();

    expect(screen.getByText('Maior dia')).toBeInTheDocument();
    expect(screen.getByText('Média por dia')).toBeInTheDocument();
    expect(screen.getByText('295 dias')).toBeInTheDocument();
    expect(screen.getByText('Dias sem gasto')).toBeInTheDocument();
    expect(screen.getByText('Menos')).toBeInTheDocument();
    expect(screen.getByText('Mais')).toBeInTheDocument();
  });

  it('keeps the period, the map and the figures apart by the 24 of the scale', async () => {
    const grid = await openMap();

    const body = grid.closest('.flex-col.gap-s24');
    expect(body).not.toBeNull();
    expect(body?.parentElement?.closest('.flex-col.gap-s24')).not.toBeNull();
  });

  it('stops the next arrow at the current year and goes back to the year before', async () => {
    const user = userEvent.setup();
    watchRequests();
    await openMap();

    expect(screen.getByRole('button', { name: 'Próximo ano' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ano anterior' }));

    const grid = await screen.findByRole('grid', { name: 'Gasto por dia em 2025' });
    expect(within(grid).getAllByRole('button')).toHaveLength(365);
    expect(asked).toHaveBeenCalledWith('?from=2025-01-01&to=2025-12-31');
    expect(screen.getByRole('button', { name: 'Próximo ano' })).toBeEnabled();
    expect(screen.getByText('365 dias')).toBeInTheDocument();
  });

  it('switches to the month: a calendar of the current month, the arrows say month', async () => {
    const user = userEvent.setup();
    watchRequests();
    await openMap();

    await user.click(screen.getByRole('radio', { name: 'Mês' }));

    const grid = await screen.findByRole('grid', { name: 'Gasto por dia em outubro de 2026' });
    expect(within(grid).getAllByRole('row')).toHaveLength(5);
    // 1 to 22 October: the days after today are outlines, not buttons.
    expect(within(grid).getAllByRole('button')).toHaveLength(22);
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
    expect(asked).toHaveBeenCalledWith('?from=2026-10-01&to=2026-10-31');
  });

  it('moves through the months with the arrows and asks each one', async () => {
    const user = userEvent.setup();
    watchRequests();
    await openMap();
    await user.click(screen.getByRole('radio', { name: 'Mês' }));
    await screen.findByRole('grid', { name: 'Gasto por dia em outubro de 2026' });

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    const september = await screen.findByRole('grid', {
      name: 'Gasto por dia em setembro de 2026',
    });
    expect(within(september).getAllByRole('button')).toHaveLength(30);
    expect(asked).toHaveBeenCalledWith('?from=2026-09-01&to=2026-09-30');
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await screen.findByRole('grid', { name: 'Gasto por dia em outubro de 2026' });
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });

  it('goes back to the year from the month, keeping where it was', async () => {
    const user = userEvent.setup();
    await openMap();
    await user.click(screen.getByRole('button', { name: 'Ano anterior' }));
    await screen.findByRole('grid', { name: 'Gasto por dia em 2025' });
    await user.click(screen.getByRole('radio', { name: 'Mês' }));
    await screen.findByRole('grid', { name: 'Gasto por dia em outubro de 2025' });

    await user.click(screen.getByRole('radio', { name: 'Ano' }));

    expect(await screen.findByRole('grid', { name: 'Gasto por dia em 2025' })).toBeInTheDocument();
  });

  it('scales the colors to the period shown: the month has its darkest square too', async () => {
    const user = userEvent.setup();
    await openMap();
    await user.click(screen.getByRole('radio', { name: 'Mês' }));
    const grid = await screen.findByRole('grid', { name: 'Gasto por dia em outubro de 2026' });

    const darkest = within(grid)
      .getAllByRole('button')
      .filter((day) => day.className.includes('bg-(--color-heatmap-4)'));
    expect(darkest.length).toBeGreaterThan(0);
  });

  it('shows a skeleton while the map loads and, if it fails, the error with a way to try again', async () => {
    server.use(
      http.get('/api/dashboard/spend-heatmap', async () => {
        await delay(50);
        return HttpResponse.json({ code: 'INTERNAL' }, { status: 500 });
      }),
    );
    await openProfile();

    expect(
      await screen.findByRole('status', { name: 'Carregando o mapa de gastos' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Não deu para carregar o mapa de gastos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('moves between days with the arrows and keeps a single tab stop', async () => {
    const user = userEvent.setup();
    const grid = await openMap();
    const stop = within(grid)
      .getAllByRole('button')
      .find((day) => day.tabIndex === 0)!;

    stop.focus();
    await user.keyboard('{ArrowLeft}');

    const focused = document.activeElement as HTMLElement;
    expect(focused).not.toBe(stop);
    expect(grid).toContainElement(focused);
    expect(focused.tabIndex).toBe(0);
    expect(stop.tabIndex).toBe(-1);
  });

  it('opens the transactions of the day that was chosen', async () => {
    const user = userEvent.setup();
    const grid = await openMap();

    await user.click(within(grid).getAllByRole('button')[100]!);

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'));
    expect(window.location.search).toMatch(/month=\d{4}-\d{2}/);
    expect(window.location.search).toMatch(/day=\d{4}-\d{2}-\d{2}/);
  });
});
