import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';

describe('ReviewQueuePage', () => {
  it('opens at /transactions/review with its header, the month picker and the Transações tab marked', async () => {
    renderApp('/transactions/review');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Para revisar' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Mês' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Transações' })[0]).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps the month in the URL', async () => {
    renderApp('/transactions/review?month=2026-10');
    await screen.findByRole('heading', { level: 1, name: 'Para revisar' });

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));

    expect(await screen.findByText('Setembro')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/transactions/review');
    expect(window.location.search).toBe('?month=2026-09');
  });
});
