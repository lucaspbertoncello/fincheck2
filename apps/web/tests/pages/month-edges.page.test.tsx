import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { restoreTestClock, setTestClock } from '#tests/support/clock/set-test-clock.util.ts';

afterEach(restoreTestClock);

// 12:00 in America/Sao_Paulo (UTC-3).
const LAST_DAY = new Date('2026-10-31T15:00:00.000Z');
const FIRST_DAY = new Date('2026-11-01T15:00:00.000Z');

describe.each([
  ['last day (31/10)', LAST_DAY, 'Sábado, 31 de outubro'],
  ['first day (01/11)', FIRST_DAY, 'Domingo, 1 de novembro'],
])('the other screens on the %s', (_name, now, heading) => {
  it('opens the review queue with a card and the rest in "Na fila"', async () => {
    setTestClock(now);
    renderApp('/transactions/review');

    expect(await screen.findByRole('heading', { name: 'PIX LANCHONETE ZE' })).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText('0 de 4 revisadas')).toBeInTheDocument();
    const queue = screen.getByRole('list', { name: 'Na fila' });
    expect(within(queue).getAllByRole('listitem')).toHaveLength(3);
  });

  it('opens the recurrences with today marked on the day strip', async () => {
    setTestClock(now);
    renderApp('/recurrences');

    expect(await screen.findByRole('heading', { name: /, dia a dia$/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Receitas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Despesas fixas' })).toBeInTheDocument();
    expect(screen.getAllByText(/hoje/i).length).toBeGreaterThan(0);
  });

  it('draws the spend heatmap in the profile, with the highest day and the average', async () => {
    setTestClock(now);
    renderApp('/profile');

    expect(await screen.findByText('Maior dia')).toBeInTheDocument();
    expect(screen.getByText('Média por dia')).toBeInTheDocument();
    expect(screen.getByText('Dias sem gasto')).toBeInTheDocument();
  });
});
