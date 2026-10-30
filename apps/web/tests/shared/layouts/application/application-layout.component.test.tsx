import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';

afterEach(() => {
  hideValuesStore.set(false);
  window.localStorage.clear();
});

describe('ApplicationLayout', () => {
  it('opens the Visão geral at the root with the date line and the month picker', async () => {
    renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Visão geral' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('navigates between tabs and marks the current one', async () => {
    renderApp('/');
    await screen.findByRole('heading', { name: 'Visão geral' });

    fireEvent.click(screen.getAllByRole('link', { name: 'Transações' })[0]!);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Transações' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/transactions');
    expect(screen.getAllByRole('link', { name: 'Transações' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('puts the selected month in the URL and keeps it across tabs', async () => {
    renderApp('/?month=2026-10');
    await screen.findByRole('heading', { name: 'Visão geral' });
    expect(screen.getByText('Outubro')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(await screen.findByText('Setembro')).toBeInTheDocument();
    expect(window.location.search).toBe('?month=2026-09');

    fireEvent.click(screen.getAllByRole('link', { name: 'Recorrentes' })[0]!);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recorrentes' }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?month=2026-09');
    expect(screen.getByText('Setembro')).toBeInTheDocument();
  });

  it.each(['/accounts', '/categories', '/categories/rules', '/settings'])(
    'has no month picker on %s',
    async (url) => {
      renderApp(url);
      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryByRole('group', { name: 'Mês' })).not.toBeInTheDocument();
    },
  );

  it.each(['/transactions', '/transactions/review', '/recurrences', '/recurrences/bills'])(
    'has the month picker on %s',
    async (url) => {
      renderApp(url);
      await screen.findByRole('heading', { level: 1 });
      expect(screen.getByRole('group', { name: 'Mês' })).toBeInTheDocument();
    },
  );

  it('shows the sub-tabs of Recorrentes and switches between them', async () => {
    renderApp('/recurrences');
    await screen.findByRole('heading', { level: 1, name: 'Recorrentes' });

    fireEvent.click(screen.getByRole('link', { name: 'A pagar e receber' }));

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences/bills'));
    expect(screen.getByRole('link', { name: 'A pagar e receber' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('hides the summary panel on Configurações', async () => {
    renderApp('/settings');
    await screen.findByRole('heading', { level: 1, name: 'Configurações' });

    expect(screen.queryByRole('button', { name: 'Ocultar valores' })).not.toBeInTheDocument();
  });

  it('toggles the eye and remembers it', async () => {
    renderApp('/');
    const eye = await screen.findByRole('button', { name: 'Ocultar valores' });
    expect(eye).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(eye);

    expect(await screen.findByRole('button', { name: 'Mostrar valores' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem('fincheck:hide-values')).toBe('1');
  });

  it('opens the "+" menu by keyboard', async () => {
    renderApp('/');
    const plus = await screen.findByRole('button', { name: 'Criar' });

    plus.focus();
    fireEvent.keyDown(plus, { key: 'Enter' });
    fireEvent.keyUp(plus, { key: 'Enter' });

    expect(await screen.findByRole('menuitem', { name: /Nova transação/ })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(8);
  });

  it('names the "+" by screen', async () => {
    renderApp('/transactions');
    expect(await screen.findByRole('button', { name: 'Nova transação' })).toBeInTheDocument();
  });

  it('switches the theme on Configurações', async () => {
    renderApp('/settings');
    fireEvent.click(await screen.findByRole('button', { name: /Tema (claro|escuro)/ }));

    expect(['light', 'dark']).toContain(document.documentElement.getAttribute('data-theme'));
    expect(window.localStorage.getItem('fincheck:theme')).toBe(
      document.documentElement.getAttribute('data-theme'),
    );
  });
});
