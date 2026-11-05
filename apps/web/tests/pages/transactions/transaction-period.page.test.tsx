import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const PAGE = `/transactions?month=${CURRENT_MONTH}`;
const LONG_WAIT = { timeout: 5000 };

async function choosePeriod(from: string, to: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: `Período: ${from}` }, LONG_WAIT));
  await user.click(await screen.findByRole('menuitemradio', { name: to }));
}

describe('Transações: the period (BR-TRX-007)', () => {
  it('starts on the month: the period button says "Mês" and the URL has no period', async () => {
    renderApp(PAGE);

    expect(await screen.findByRole('button', { name: 'Período: Mês' }, LONG_WAIT)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeInTheDocument();
    expect(window.location.search).not.toContain('period');
  });

  it('offers Mês, 12 meses, Este ano and Tudo, with the chosen one checked', async () => {
    const user = userEvent.setup();
    renderApp(PAGE);
    await user.click(await screen.findByRole('button', { name: 'Período: Mês' }, LONG_WAIT));

    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual([
      'Mês',
      '12 meses',
      'Este ano',
      'Tudo',
    ]);
    expect(options.map((option) => option.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  it('"12 meses" goes to the URL and keeps the month of the app', async () => {
    renderApp(PAGE);
    await screen.findByText('CINEMARK', undefined, LONG_WAIT);

    await choosePeriod('Mês', '12 meses');

    await waitFor(() => expect(window.location.search).toContain('period=12m'));
    expect(window.location.search).toContain(`month=${CURRENT_MONTH}`);
    // The range takes the month place (today is 22 Oct 2026), and the button is lit as 12 meses.
    expect(
      screen.getByText('nov 2025 – out 2026', { selector: '[aria-live]' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Período: 12 meses' })).toBeInTheDocument();
  });

  it('reads ?period= from the URL, and a value it does not know is the month', async () => {
    renderApp(`${PAGE}&period=year`);
    expect(
      await screen.findByText('2026', { selector: '[aria-live]' }, LONG_WAIT),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Período: Este ano' })).toBeInTheDocument();
  });

  it('ignores a period it does not know', async () => {
    renderApp(`${PAGE}&period=5y`);
    expect(await screen.findByRole('button', { name: 'Período: Mês' }, LONG_WAIT)).toBeVisible();
    expect(await screen.findByText('CINEMARK', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('going back to "Mês" takes the period out of the URL', async () => {
    renderApp(`${PAGE}&period=all`);
    await screen.findByText('Tudo', { selector: '[aria-live]' }, LONG_WAIT);

    await choosePeriod('Tudo', 'Mês');

    await waitFor(() => expect(window.location.search).not.toContain('period'));
    expect(await screen.findByRole('region', { name: 'Totais do mês' }, LONG_WAIT)).toBeVisible();
  });

  it('lists a wider period by month, newest first, with the month as the heading', async () => {
    renderApp(`${PAGE}&period=12m`);

    expect(await screen.findByRole('heading', { name: 'Outubro 2026' }, LONG_WAIT)).toBeVisible();
    // October alone fills the first page (60 rows): the next page brings September.
    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar mais' }));
    expect(await screen.findByRole('heading', { name: 'Setembro 2026' }, LONG_WAIT)).toBeVisible();
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toContain('Setembro 2026');
    expect(headings.indexOf('Outubro 2026')).toBeLessThan(headings.indexOf('Setembro 2026'));
    expect(screen.getAllByText('CINEMARK').length).toBeGreaterThan(0);
  });

  it('shows the totals of the period (despesas and receitas, no "fora da conta")', async () => {
    renderApp(`${PAGE}&period=12m`);

    const totals = await screen.findByRole('region', { name: 'Totais do período' }, LONG_WAIT);
    expect(within(totals).getByText('Despesas')).toBeInTheDocument();
    expect(within(totals).getByText('Receitas')).toBeInTheDocument();
    expect(within(totals).queryByText('Fora da conta')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Totais do mês' })).not.toBeInTheDocument();
  });

  it('asks the API for the range and for pages, with the cursor on the next one', async () => {
    const asked: URLSearchParams[] = [];
    server.use(
      http.get('/api/transactions', ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return undefined;
      }),
    );
    renderApp(`${PAGE}&period=all`);
    await screen.findByRole('heading', { name: 'Outubro 2026' }, LONG_WAIT);

    // "Tudo" has no range at all, and never the month; the page size is 60.
    const first = asked.find((params) => params.get('limit') === '60');
    expect(first).toBeDefined();
    expect(first?.has('month')).toBe(false);
    expect(first?.has('from')).toBe(false);
    expect(first?.has('cursor')).toBe(false);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar mais' }));

    await waitFor(() => expect(asked.some((params) => params.has('cursor'))).toBe(true));
    expect(asked.find((params) => params.has('cursor'))?.get('limit')).toBe('60');
  });

  it('"Mostrar mais" brings the next page below, keeps what is on screen and ends at the last page', async () => {
    renderApp(`${PAGE}&period=all`);
    await screen.findByRole('heading', { name: 'Outubro 2026' }, LONG_WAIT);
    const rowsOf = () => screen.getAllByRole('listitem').length;
    const before = rowsOf();
    // A row of the first page: the page that comes must not rebuild it.
    const kept = screen.getAllByText('CINEMARK')[0];

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar mais' }));
    await waitFor(() => expect(rowsOf()).toBeGreaterThan(before), LONG_WAIT);
    expect(screen.getAllByText('CINEMARK')).toContain(kept);

    // Keep asking until the last page: the button goes away and the oldest month shows.
    for (let page = 0; page < 8; page += 1) {
      const more = screen.queryByRole('button', { name: 'Mostrar mais' });
      if (!more) break;
      const count = rowsOf();
      fireEvent.click(more);
      await waitFor(() => expect(rowsOf()).toBeGreaterThan(count), LONG_WAIT);
    }
    expect(screen.queryByRole('button', { name: 'Mostrar mais' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novembro 2025' })).toBeVisible();
  });

  it('shows the empty screen of the period, not of the month', async () => {
    server.use(
      http.get('/api/transactions', () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    renderApp(`${PAGE}&period=12m`);

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Nenhuma transação nos últimos 12 meses' },
        LONG_WAIT,
      ),
    ).toBeVisible();
  });

  it('"Por categoria" in a period compares with the period before', async () => {
    renderApp(`${PAGE}&period=12m&view=category`);

    expect(await screen.findByText('por categoria', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByText(/que os 12 meses antes/)).toBeInTheDocument();
    // The expected income of the recurrences is by month: the period only shows what came in.
    expect(screen.getByText(/^de \d+ fontes?$/)).toBeInTheDocument();
    expect(screen.queryByText('Recebido do esperado')).not.toBeInTheDocument();
  });

  it('"Por categoria" in "Tudo" has no variation and no comparison', async () => {
    renderApp(`${PAGE}&period=all&view=category`);

    expect(await screen.findByText('por categoria', undefined, LONG_WAIT)).toBeInTheDocument();
    expect(screen.getByText('Sem período anterior para comparar')).toBeInTheDocument();
    expect(screen.queryByText(/que os 12 meses antes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/% que|a mais que|a menos que/)).not.toBeInTheDocument();
  });

  it('"Ver as N transações na lista" keeps the period', async () => {
    renderApp(`${PAGE}&period=12m&view=category`);

    fireEvent.click(await screen.findByRole('button', { name: /Mercado/ }, LONG_WAIT));
    fireEvent.click(await screen.findByRole('button', { name: /Ver as \d+ transações na lista/ }));

    await waitFor(() => expect(window.location.search).toContain('category='));
    expect(window.location.search).toContain('period=12m');
    expect(window.location.search).not.toContain('view=category');
  });
});
