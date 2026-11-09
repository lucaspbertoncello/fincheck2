import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { restoreTestClock, setTestClock } from '#tests/support/clock/set-test-clock.util.ts';

afterEach(() => {
  window.localStorage.clear();
  restoreTestClock();
});

// 12:00 in America/Sao_Paulo (UTC-3).
const LAST_DAY = new Date('2026-10-31T15:00:00.000Z');
const LAST_DAY_NIGHT = new Date('2026-11-01T02:30:00.000Z');
const FIRST_DAY = new Date('2026-11-01T15:00:00.000Z');
const FIRST_DAY_DAWN = new Date('2026-11-01T03:30:00.000Z');

describe('OverviewPage on the last day of the month', () => {
  it('has a single day: the slider is on "Dia 1 de 1" and both arrows are off', async () => {
    setTestClock(LAST_DAY);
    renderApp('/');
    const slider = await screen.findByRole('group', { name: 'Até o fim do mês' });

    expect(await screen.findByText('Dia 1 de 1')).toBeInTheDocument();
    expect(within(slider).getByRole('button', { name: 'Dia anterior' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(slider).getByRole('button', { name: 'Próximo dia' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('keeps the same day at 23:30, still October in São Paulo', async () => {
    setTestClock(LAST_DAY_NIGHT);
    renderApp('/');

    expect(await screen.findByText('Dia 1 de 1')).toBeInTheDocument();
    expect(screen.getByText('Sábado, 31 de outubro')).toBeInTheDocument();
  });

  it('says "Faltam 1 dia" and speaks in the singular in the summary panel', async () => {
    setTestClock(LAST_DAY);
    renderApp('/');

    const remaining = await screen.findByLabelText('O que falta no mês');
    expect(remaining).toHaveTextContent('Faltam1 dia');
    expect(remaining).not.toHaveTextContent('1 dias');
    expect(await screen.findByText('Sobra no fim do mês')).toBeInTheDocument();
    expect(screen.getByText(/≈.*hoje/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('1 dias');
  });

  it('shows a single week card with one day in the weeks view', async () => {
    const user = userEvent.setup();
    setTestClock(LAST_DAY);
    renderApp('/');
    await screen.findByRole('group', { name: 'Até o fim do mês' });

    await user.click(screen.getByRole('radio', { name: 'Semana' }));

    const weeks = await screen.findByRole('list', { name: /^Semanas/ });
    const cards = within(weeks).getAllByRole('button');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAccessibleName(/31 de outubro/);
  });
});

describe('OverviewPage on the first day of the month', () => {
  it('starts the slider on "Dia 1 de 30": back is off, forward is on', async () => {
    setTestClock(FIRST_DAY);
    renderApp('/');
    const slider = await screen.findByRole('group', { name: 'Até o fim do mês' });

    expect(await screen.findByText('Dia 1 de 30')).toBeInTheDocument();
    expect(within(slider).getByRole('button', { name: 'Dia anterior' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(within(slider).getByRole('button', { name: 'Próximo dia' })).not.toHaveAttribute(
      'aria-disabled',
    );
    expect(screen.getAllByText('Novembro 2026').length).toBeGreaterThan(0);
  });

  it('is already November at 00:30, with 30 days to go', async () => {
    setTestClock(FIRST_DAY_DAWN);
    renderApp('/');

    expect(await screen.findByLabelText('O que falta no mês')).toHaveTextContent('Faltam30 dias');
    expect(screen.getByText('Domingo, 1 de novembro')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Dia 1 de 30')).toBeInTheDocument());
  });
});
