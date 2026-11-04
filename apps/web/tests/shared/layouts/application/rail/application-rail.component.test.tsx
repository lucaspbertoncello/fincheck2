import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

let media: ReturnType<typeof stubMatchMedia> | undefined;

afterEach(() => {
  media?.restore();
  media = undefined;
});

function renderDesktop(url: string) {
  media?.restore(); // a test that renders twice must not leave the first stub as the "original"
  media = stubMatchMedia({ desktop: true });
  return renderApp(url);
}

// The bottom bar is in the DOM too (hidden by CSS on the desktop), so the rail is found by its class.
const rail = () => document.querySelector<HTMLElement>('nav.rail')!;

describe('ApplicationRail', () => {
  it('takes the place of the top bar on the desktop: no banner, the five tabs and Configurações', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    expect(document.querySelector('.h-topbar-mobile')).toBeNull();
    const names = within(rail())
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label') ?? link.textContent);
    expect(names).toEqual([
      'Fincheck, Visão geral',
      'Visão geral',
      'Transações',
      'Recorrentes',
      'Contas e cartões',
      'Categorias',
      'Configurações',
    ]);
  });

  it('names every link by itself, so the labels can stay hidden while the rail is closed', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    for (const name of ['Visão geral', 'Transações', 'Recorrentes', 'Contas e cartões']) {
      expect(within(rail()).getByRole('link', { name })).toHaveAttribute('aria-label', name);
    }
    expect(within(rail()).getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'aria-label',
      'Configurações',
    );
  });

  it('marks the current tab and carries the sliding capsule only there', async () => {
    renderDesktop('/transactions');
    await screen.findByRole('heading', { level: 1, name: 'Transações' });

    const current = within(rail()).getByRole('link', { name: 'Transações' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.querySelector('.tab-indicator')).not.toBeNull();
    expect(rail().querySelectorAll('.tab-indicator')).toHaveLength(1);
    expect(within(rail()).getByRole('link', { name: 'Visão geral' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks Configurações without a sliding capsule', async () => {
    renderDesktop('/settings');
    await screen.findByRole('heading', { level: 1, name: 'Configurações' });

    expect(within(rail()).getByRole('link', { name: 'Configurações' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(rail().querySelectorAll('.tab-indicator')).toHaveLength(0);
  });

  it('keeps the month in every link and goes to the tab on click', async () => {
    renderDesktop('/?month=2026-10');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    const link = within(rail()).getByRole('link', { name: 'Recorrentes' });
    expect(link.getAttribute('href')).toContain('month=2026-10');
    fireEvent.click(link);

    await waitFor(() => expect(window.location.pathname).toBe('/recurrences'));
    expect(window.location.search).toContain('month=2026-10');
  });

  it('holds the "+" of the screen: the menu on Visão geral, the direct action on Transações', async () => {
    const view = renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });
    expect(await within(rail()).findByRole('button', { name: 'Criar' })).toHaveAttribute(
      'aria-haspopup',
    );
    view.unmount();

    renderDesktop('/transactions');
    await screen.findByRole('heading', { level: 1, name: 'Transações' });
    const plus = await within(rail()).findByRole('button', { name: 'Nova transação' });
    expect(plus).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(plus);
    await waitFor(() => expect(window.location.search).toContain('new=transaction'));
  });

  it('shows the name of the "+" as visible text for the open rail', async () => {
    renderDesktop('/accounts');
    await screen.findByRole('heading', { level: 1, name: 'Contas e cartões' });
    const plus = await within(rail()).findByRole('button', { name: 'Conectar conta' });

    expect(plus.querySelector('.rail-label')).toHaveTextContent('Conectar conta');
  });

  it('leaves the panel slot of Configurações in the grid, sticky at the top', async () => {
    renderDesktop('/settings');
    await screen.findByRole('heading', { level: 1, name: 'Configurações' });

    const frame = screen.getByRole('main').parentElement?.parentElement;
    expect(frame).toHaveClass('overflow-y-clip', 'min-h-dvh');
    const slot = screen.getByRole('main').previousElementSibling;
    expect(slot?.tagName).toBe('ASIDE');
    expect(slot).toHaveClass('sticky', 'top-s16');
  });

  it('is not rendered on the phone, which keeps the top bar and the bottom bar', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    expect(screen.getAllByRole('banner')).not.toHaveLength(0);
    expect(document.querySelector('.rail')).toBeNull();
  });
});
