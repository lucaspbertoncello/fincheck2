import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

// The bottom bar is in the DOM too (hidden by CSS on the desktop), so the rail is found by its label.
// React Aria drops the first pointer event it sees in a page (it has no pointer type to trust
// yet), so the first hover of a test is repeated; later ones need no help.
async function hover(element: HTMLElement) {
  await userEvent.hover(element);
  await userEvent.unhover(element);
  await userEvent.hover(element);
}

const rail = () => document.querySelector<HTMLElement>('nav.glass[aria-label="Principal"]')!;

describe('ApplicationRail', () => {
  it('takes the place of the top bar on the desktop: no banner, the six tabs and Configurações', async () => {
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
      'Perfil',
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

  it('puts Perfil right below Categorias, with the sliding capsule when it is the current one', async () => {
    renderDesktop('/profile');
    await screen.findByRole('heading', { level: 1, name: 'Perfil' });

    const current = within(rail()).getByRole('link', { name: 'Perfil' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.querySelector('.tab-indicator')).not.toBeNull();
    expect(current.previousElementSibling).toBe(
      within(rail()).getByRole('link', { name: 'Categorias' }),
    );
    expect(within(rail()).getByRole('link', { name: 'Configurações' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('marks Configurações with the sliding capsule, like the tabs', async () => {
    renderDesktop('/settings/connections');
    await screen.findByRole('heading', { level: 1, name: 'Conexões' });

    const link = within(rail()).getByRole('link', { name: 'Configurações' });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(rail().querySelectorAll('.tab-indicator')).toHaveLength(1);
    expect(link.querySelector('.tab-indicator')).not.toBeNull();
  });

  it('opens Conexões straight from the rail: no redirect hop that would cut the page transition', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    const link = within(rail()).getByRole('link', { name: 'Configurações' });
    expect(link).toHaveAttribute('href', '/settings/connections');
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

  it('does not hold the "+": it floats at the bottom right of the window', async () => {
    renderDesktop('/transactions');
    await screen.findByRole('heading', { level: 1, name: 'Transações' });

    expect(within(rail()).queryByRole('button')).toBeNull();
    const plus = await screen.findByRole('button', { name: 'Nova transação' });
    expect(rail()).not.toContainElement(plus);
    expect(plus.closest('[data-floating-plus]')).not.toBeNull();
    fireEvent.click(plus);
    await waitFor(() => expect(window.location.search).toContain('new=transaction'));
  });

  it('never opens: the rail has one fixed width and no text labels, only icons', async () => {
    renderDesktop('/accounts');
    await screen.findByRole('heading', { level: 1, name: 'Contas e cartões' });

    expect(rail()).toHaveClass('w-14', 'glass');
    expect(rail().querySelector('.rail-label')).toBeNull();
    expect(rail()).not.toHaveAttribute('data-open');
    await hover(within(rail()).getByRole('link', { name: 'Transações' }));
    expect(rail()).toHaveClass('w-14');
    expect(rail()).not.toHaveAttribute('data-open');
  });

  it('shows the name of an icon as a tip on hover', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    expect(screen.queryByRole('tooltip')).toBeNull();
    await hover(within(rail()).getByRole('link', { name: 'Recorrentes' }));

    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Recorrentes');
    await userEvent.unhover(within(rail()).getByRole('link', { name: 'Recorrentes' }));
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
  });

  it('shows the name of an icon on keyboard focus, and the tip says the accessible name', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    await userEvent.tab();
    const focused = document.activeElement as HTMLElement;
    expect(rail()).toContainElement(focused);

    const tip = await screen.findByRole('tooltip');
    // same text as the link's name: the browser drops the equal description, nothing is read twice
    expect(tip).toHaveTextContent(focused.getAttribute('aria-label') ?? '');
    expect(focused).toHaveAttribute('aria-describedby', tip.id);
  });

  it('gives the "+" and Configurações a tip with their names', async () => {
    renderDesktop('/transactions');
    await screen.findByRole('heading', { level: 1, name: 'Transações' });

    const plus = await screen.findByRole('button', { name: 'Nova transação' });
    await hover(plus);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Nova transação');
    await userEvent.unhover(plus);
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

    await hover(within(rail()).getByRole('link', { name: 'Configurações' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Configurações');
  });

  it('centers the icons in the rail, which the shell stretches to the height of the panel', async () => {
    renderDesktop('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    expect(rail()).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    // the rail and the left box are siblings in one sticky pair that stretches both to one height
    const pair = rail().parentElement!;
    expect(pair).toHaveClass('sticky', 'flex', 'gap-s8');
    expect(pair).not.toHaveClass('items-start', 'items-center');
    expect(rail().nextElementSibling?.tagName).toBe('ASIDE');
    expect(pair.nextElementSibling).toBe(screen.getByRole('main'));
  });

  it('leaves the panel slot of Configurações beside the rail, in the sticky pair', async () => {
    renderDesktop('/settings/connections');
    await screen.findByRole('heading', { level: 1, name: 'Conexões' });

    const frame = screen.getByRole('main').parentElement?.parentElement;
    expect(frame).toHaveClass('overflow-y-clip', 'min-h-dvh');
    const pair = screen.getByRole('main').previousElementSibling;
    expect(pair).toHaveClass('sticky', 'top-s24', 'xl:top-s32');
    const slot = rail().nextElementSibling;
    expect(slot?.tagName).toBe('ASIDE');
    expect(slot).toHaveClass('w-panel');
    expect(pair).toContainElement(slot as HTMLElement);
  });

  it('is not rendered on the phone, which keeps the top bar and the bottom bar', async () => {
    renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Visão geral' });

    expect(screen.getAllByRole('banner')).not.toHaveLength(0);
    expect(document.querySelector('nav.glass[aria-label="Principal"]')).toBeNull();
  });
});
