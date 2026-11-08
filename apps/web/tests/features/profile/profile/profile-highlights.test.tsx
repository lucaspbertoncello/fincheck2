import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
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

const LABELS = [
  'Maior Pix enviado',
  'Maior Pix recebido',
  'Categoria líder',
  'Mês mais caro',
  'Dia que mais gasta',
  'Sequência sem gastar',
];

const NO_DATA: Profile.Highlights = {
  largestPixSent: null,
  largestPixReceived: null,
  topCategory: null,
  costliestMonth: null,
  costliestWeekday: null,
  longestNoSpendStreak: null,
};

function answerWith(highlights: Profile.Highlights) {
  server.use(http.get('/api/profile/highlights', () => HttpResponse.json(highlights)));
}

async function openSection() {
  renderApp('/profile');
  await screen.findByRole('heading', { level: 1, name: 'Perfil' });
  return screen.findByRole('heading', { level: 2, name: 'Curiosidades' });
}

const cards = () =>
  within(screen.getByRole('list', { name: 'Curiosidades' })).getAllByRole('article');

describe('Perfil: curiosidades', () => {
  it('comes after the spend map and shows the six cards in the fixed order', async () => {
    const title = await openSection();
    const mapTitle = await screen.findByRole('heading', {
      level: 2,
      name: 'Mapa de gastos',
    });

    expect(mapTitle.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() =>
      expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual(LABELS),
    );
    await waitFor(() => expect(screen.queryByText('Ainda sem dado')).toBeNull());
  });

  it('draws three cards per row in the wide section and two on the phone, in the card of the system', async () => {
    await openSection();

    const list = screen.getByRole('list', { name: 'Curiosidades' });
    expect(list).toHaveClass('grid', 'grid-cols-2', '@min-[40rem]/highlights:grid-cols-3');
    for (const card of cards()) {
      expect(card).toHaveClass('rounded-panel', 'border', 'bg-glass');
      // the label never wraps
      expect(within(card).getByRole('heading', { level: 3 })).toHaveClass('whitespace-nowrap');
    }
  });

  it('writes the number, who the Pix was with and the date', async () => {
    const category = db.categories.find((item) => item.kind === 'expense');
    answerWith({
      largestPixSent: {
        amountCents: 120_000,
        counterparty: 'RAFAEL MOURA',
        occurredOn: '2026-03-12',
        transactionId: '0194f3a0-0000-7000-8000-000000000001',
      },
      largestPixReceived: {
        amountCents: 45_050,
        counterparty: null,
        occurredOn: '2025-11-03',
        transactionId: '0194f3a0-0000-7000-8000-000000000002',
      },
      topCategory: {
        categoryId: category?.id ?? '',
        totalCents: 540_000,
        sharePercent: 31.4,
      },
      costliestMonth: { month: '2026-03', totalCents: 910_000 },
      costliestWeekday: { weekday: 6, averageCents: 18_500 },
      longestNoSpendStreak: { days: 4, from: '2026-05-02', to: '2026-05-05' },
    });
    await openSection();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    const [sent, received, top, month, weekday, streak] = cards();
    expect(sent).toHaveTextContent('1.200,00');
    expect(sent).toHaveTextContent('para Rafael Moura');
    expect(sent).toHaveTextContent('12 mar');
    // No name on the statement: only the date (and the year, since it is another year).
    expect(received).toHaveTextContent('450,50');
    expect(received).toHaveTextContent('3 nov 2025');
    expect(received).not.toHaveTextContent('para');
    expect(received).not.toHaveTextContent('null');
    expect(top).toHaveTextContent(category?.name ?? '');
    expect(top).toHaveTextContent('31,4% do gasto');
    expect(month).toHaveTextContent('9.100,00');
    expect(month).toHaveTextContent('Março de 2026');
    expect(weekday).toHaveTextContent('185,00');
    expect(weekday).toHaveTextContent('Sábado');
    expect(streak).toHaveTextContent('4');
    expect(streak).toHaveTextContent('dias');
    expect(streak).toHaveTextContent('2 a 5 mai');
  });

  it('says "Ainda sem dado" on every card with no data, with the same rows as a full one', async () => {
    answerWith(NO_DATA);
    await openSection();
    await waitFor(() => expect(screen.getAllByText('Ainda sem dado')).toHaveLength(6));

    // The label, the icon and the card stay; the number row and the context row keep their height.
    expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual(LABELS);
    for (const card of cards()) {
      const [numberRow, contextRow] = Array.from(card.children).slice(1) as HTMLElement[];
      expect(numberRow).toHaveClass('h-8');
      expect(contextRow).toHaveClass('h-10');
    }
  });

  it('gives a card with data the same two rows', async () => {
    await openSection();
    await waitFor(() => expect(screen.queryByText('Ainda sem dado')).toBeNull());

    for (const card of cards()) {
      const [numberRow, contextRow] = Array.from(card.children).slice(1) as HTMLElement[];
      expect(numberRow).toHaveClass('h-8');
      expect(contextRow).toHaveClass('h-10');
    }
  });

  it('shows a loading state with the same six boxes', async () => {
    server.use(
      http.get('/api/profile/highlights', async () => {
        await delay(150);
        return HttpResponse.json(NO_DATA);
      }),
    );
    await openSection();

    expect(await screen.findByRole('status', { name: 'Carregando as curiosidades' })).toBeVisible();
    expect(cards()).toHaveLength(6);
    expect(screen.queryByText('Ainda sem dado')).toBeNull();
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('shows the error and reads again on retry', async () => {
    const user = userEvent.setup();
    let fail = true;
    server.use(
      http.get('/api/profile/highlights', () =>
        fail
          ? HttpResponse.json({ code: 'UNKNOWN_ERROR', message: 'x' }, { status: 500 })
          : HttpResponse.json(NO_DATA),
      ),
    );
    await openSection();

    const alert = await screen.findByText('Não deu para carregar as curiosidades');
    expect(alert).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(screen.getAllByText('Ainda sem dado')).toHaveLength(6));
    expect(screen.queryByText('Não deu para carregar as curiosidades')).toBeNull();
  });
});
