import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { hideValuesStore } from '#/shared/stores/hide-values.store.ts';
import { setTheme } from '#/shared/stores/theme.store.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';
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

  it('clips the frame so a hidden chart table cannot stretch the page into a blank band', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    const frame = screen.getByRole('main').parentElement?.parentElement;

    expect(frame).toHaveClass('relative', 'overflow-y-clip', 'min-h-dvh');
  });

  it('keeps the pair (rail + left box) and the page in one centered frame, with the large margin', async () => {
    const media = stubMatchMedia({ desktop: true });
    try {
      renderApp('/');
      await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

      const row = screen.getByRole('main').parentElement!;
      const frame = row.parentElement!;
      const rail = document.querySelector('nav.glass[aria-label="Principal"]')!;
      const pair = rail.parentElement!;

      expect(frame).toHaveClass('mx-auto', 'max-w-[84rem]', 'p-s24', 'xl:p-s32');
      expect(row).toHaveClass('flex', 'gap-s32'); // large space between the pair and the page
      expect(row).not.toHaveClass('items-center');
      expect(pair).toHaveClass('gap-s8', 'sticky', 'top-s24', 'xl:top-s32'); // small space inside the pair
      expect(pair.parentElement).toBe(row);
      expect(rail).toHaveClass('w-14');
    } finally {
      media.restore();
    }
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
    renderApp('/settings/appearance');
    fireEvent.click(await screen.findByRole('radio', { name: 'Escuro' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem('fincheck:theme')).toBe('dark');
  });

  it('follows the OS theme from the start of the app when the preference is "Sistema"', async () => {
    const media = stubMatchMedia();
    try {
      renderApp('/');
      await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

      media.setSystemDark(true);

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    } finally {
      setTheme('light'); // stops following the system theme
      media.restore();
    }
  });

  it('opens the creation modal of the screen from the "+" menu, keeping the month', async () => {
    renderApp('/?month=2026-10');
    const plus = await screen.findByRole('button', { name: 'Criar' });
    plus.focus();
    fireEvent.keyDown(plus, { key: 'Enter' });
    fireEvent.keyUp(plus, { key: 'Enter' });

    fireEvent.click(await screen.findByRole('menuitem', { name: /Nova recorrência/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('new=recurrence');
    expect(window.location.search).toContain('month=2026-10');
    expect(await screen.findByRole('dialog', { name: 'Nova recorrência' })).toBeInTheDocument();
  });

  it('opens "Nova transação" from the direct "+" of Transações', async () => {
    renderApp('/transactions?month=2026-10');
    fireEvent.click(await screen.findByRole('button', { name: 'Nova transação' }));

    await waitFor(() => expect(window.location.search).toContain('new=transaction'));
    expect(window.location.search).toContain('month=2026-10');
    expect(await screen.findByRole('dialog', { name: 'Nova transação' })).toBeInTheDocument();
  });

  it.each([
    ['/transactions', 'Nova transação', 'new=transaction'],
    ['/transactions/review', 'Nova transação', 'new=transaction'],
    ['/recurrences', 'Nova recorrência', 'new=recurrence'],
    ['/accounts', 'Conectar conta', 'new=account'],
    ['/categories', 'Nova categoria', 'new=category'],
    ['/categories/rules', 'Nova regra', 'new=rule'],
  ])('the "+" of %s opens "%s" directly, with the month kept', async (url, label, param) => {
    renderApp(`${url}?month=2026-10`);
    await screen.findByRole('heading', { level: 1 });
    // The top bar is the first banner; some screens also have their own button of the same name.
    fireEvent.click(within(screen.getAllByRole('banner')[0]!).getByRole('button', { name: label }));

    await waitFor(() => expect(window.location.search).toContain(param));
    expect(window.location.search).toContain('month=2026-10');
    // The button says where it goes ("Conectar conta"); the modal says what it does.
    const title = label === 'Conectar conta' ? 'Conectar banco' : label;
    expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
  });

  it.each(['/', '/recurrences/bills', '/settings'])(
    'the "+" of %s opens the menu of everything that can be created',
    async (url) => {
      renderApp(url);
      const plus = await screen.findByRole('button', {
        name: 'Criar',
      });
      plus.focus();
      fireEvent.keyDown(plus, { key: 'Enter' });
      fireEvent.keyUp(plus, { key: 'Enter' });

      expect(await screen.findAllByRole('menuitem')).toHaveLength(8);
    },
  );

  it('keeps the screen parameters that are not the month', async () => {
    renderApp('/transactions?month=2026-10&view=category');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Transações' }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain('view=category');
  });

  it.each([
    ['Nova transação', '/transactions', 'new=transaction'],
    ['Compra parcelada', '/transactions', 'new=installment'],
    ['Nova conta a pagar ou receber', '/recurrences/bills', 'new=bill'],
    ['Dívida com amigo', '/recurrences/bills', 'new=debt'],
    ['Nova recorrência', '/recurrences', 'new=recurrence'],
    ['Conectar conta', '/accounts', 'new=account'],
    ['Nova categoria', '/categories', 'new=category'],
    ['Nova regra', '/categories/rules', 'new=rule'],
  ])('sends "%s" to %s with %s', async (label, pathname, param) => {
    renderApp('/?month=2026-10');
    const plus = await screen.findByRole('button', { name: 'Criar' });
    plus.focus();
    fireEvent.keyDown(plus, { key: 'Enter' });
    fireEvent.keyUp(plus, { key: 'Enter' });

    fireEvent.click(await screen.findByRole('menuitem', { name: new RegExp(label) }));

    await waitFor(() => expect(window.location.pathname).toBe(pathname));
    expect(window.location.search).toContain(param);
    expect(window.location.search).toContain('month=2026-10');
  });
});
