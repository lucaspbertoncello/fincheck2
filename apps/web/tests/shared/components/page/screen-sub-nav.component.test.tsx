import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const LONG_WAIT = { timeout: 5000 };

async function openNav(path: string) {
  renderApp(`${path}?month=${CURRENT_MONTH}`);
  return within(
    await screen.findByRole('navigation', { name: 'Seções de Recorrentes' }, LONG_WAIT),
  );
}

describe('ScreenSubNav of Recorrentes', () => {
  it('has the four tabs in order, each leading to its screen with the month', async () => {
    const nav = await openNav('/recurrences');

    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Recorrências',
      'A pagar e receber',
      'Assinaturas',
      'Amigos',
    ]);
    expect(nav.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      `/recurrences?month=${CURRENT_MONTH}`,
      `/recurrences/bills?month=${CURRENT_MONTH}`,
      `/recurrences/subscriptions?month=${CURRENT_MONTH}`,
      `/recurrences/friends?month=${CURRENT_MONTH}`,
    ]);
    expect(nav.getByRole('link', { name: 'Recorrências' })).toHaveAttribute('aria-current', 'page');
  });

  it('is dense on the phone (no icons, 12 px labels, 4 px padding) so the four tabs fit in 375 px', async () => {
    const nav = await openNav('/recurrences');

    for (const link of nav.getAllByRole('link')) {
      expect(link.className).toContain('max-lg:px-s4');
      expect(link.className).toContain('max-lg:text-caption');
      expect(link.querySelector('svg')).toHaveClass('max-lg:hidden');
    }
  });

  it('leaves the two tabs of Categorias as they were', async () => {
    renderApp(`/categories?month=${CURRENT_MONTH}`);
    const nav = within(
      await screen.findByRole('navigation', { name: 'Seções de Categorias' }, LONG_WAIT),
    );

    for (const link of nav.getAllByRole('link')) {
      expect(link.className).not.toContain('max-lg:text-caption');
      expect(link.querySelector('svg')).not.toHaveClass('max-lg:hidden');
    }
  });

  it('marks Amigos as the current one on its own screen, and only that one', async () => {
    const nav = await openNav('/recurrences/friends');

    expect(nav.getByRole('link', { name: 'Amigos' })).toHaveAttribute('aria-current', 'page');
    expect(
      nav.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);
  });
});
