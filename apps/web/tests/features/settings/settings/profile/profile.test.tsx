import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  renderApp('/settings/profile');
  return screen.findByRole('heading', { level: 1, name: 'Perfil' });
}

describe('Perfil', () => {
  it('opens first in the side menu and shows the name, the initials and the expected income', async () => {
    await openProfile();

    const nav = await screen.findByRole('navigation', { name: 'Páginas de Configurações' });
    expect(within(nav).getAllByRole('link')[0]).toHaveTextContent('Perfil');
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
    expect(await screen.findByText(income.name, { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThanOrEqual(
      incomes.length + 1,
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
    expect(within(dialog).getByText('LB')).toBeInTheDocument(); // live preview

    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Lucas Bertoncello', { selector: 'p' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('LB')).toBeInTheDocument();
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
    await screen.findByText(income.name, { selector: 'p' });

    // The first "Editar" is the profile's; the sources come after it.
    await user.click(screen.getAllByRole('button', { name: 'Editar' })[1]!);

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('edit=');
  });
});

describe('Mapa de gastos', () => {
  async function openMap() {
    await openProfile();
    return screen.findByRole('grid', { name: 'Gasto por dia nos últimos 12 meses' });
  }

  it('draws a named button per day and a text summary beside it', async () => {
    const grid = await openMap();

    const days = within(grid).getAllByRole('button');
    expect(days.length).toBeGreaterThanOrEqual(330);
    expect(days.filter((day) => day.tabIndex === 0)).toHaveLength(1);
    expect(days[0]).toHaveAccessibleName(/^(Sem gastos|R\$ )/);
    expect(screen.getByText('Maior dia')).toBeInTheDocument();
    expect(screen.getByText('Média por dia')).toBeInTheDocument();
    expect(screen.getByText('Dias sem gasto')).toBeInTheDocument();
    expect(screen.getByText('Menos')).toBeInTheDocument();
    expect(screen.getByText('Mais')).toBeInTheDocument();
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
