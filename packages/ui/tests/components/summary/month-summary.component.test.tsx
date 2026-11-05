import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  ExpenseSummaryCard,
  expenseBar,
  incomeBar,
  IncomeSummaryCard,
  MonthSummaryCards,
  ResultSummaryCard,
  resultBar,
} from '#/components/summary/index.ts';

describe('summary bars', () => {
  it('fills the income bar with received over expected, capped at 100', () => {
    expect(incomeBar(380200, 842700)[0]?.percent).toBeCloseTo(45.1, 1);
    expect(incomeBar(900000, 842700)[0]?.percent).toBe(100);
    expect(incomeBar(100, 0)[0]?.percent).toBe(0);
  });

  it('paints the expense bar gray for the previous month and red past it', () => {
    expect(expenseBar(300000, 400000).map((s) => s.tone)).toEqual(['strong', 'muted']);
    const over = expenseBar(500000, 400000);
    expect(over.map((s) => s.tone)).toEqual(['strong', 'loss']);
    expect(over[0]?.percent).toBeCloseTo(80);
    expect(over[1]?.percent).toBeCloseTo(20);
    expect(expenseBar(0, 0)).toEqual([]);
  });

  it('splits the result bar into expenses and what is left, red when overspent', () => {
    expect(resultBar(1000, 250).map((s) => s.tone)).toEqual(['muted', 'gain']);
    expect(resultBar(1000, 1500)).toEqual([{ percent: 100, tone: 'loss' }]);
  });
});

describe('IncomeSummaryCard', () => {
  it('shows the received value, the expected one with the note, the percent and the legend', () => {
    const html = renderToStaticMarkup(
      <IncomeSummaryCard
        receivedCents={380200}
        expectedCents={842700}
        pendingNote="Aurora ainda vem"
      />,
    );

    expect(html).toContain('aria-label="Receitas"');
    expect(html).toContain('3.802,00');
    expect(html).toContain('8.427,00');
    expect(html).toContain('; Aurora ainda vem');
    expect(html).toContain('45%');
    expect(html).toContain('Recebido do esperado');
    expect(html).toContain('role="img"');
  });
});

describe('ExpenseSummaryCard', () => {
  const BASE = {
    spentCents: 348620,
    previousSamePointCents: 317275,
    previousTotalCents: 400000,
    previousMonthLabel: 'setembro',
  };

  it('keeps the badge gray under 10% and writes the delta against the month', () => {
    const html = renderToStaticMarkup(<ExpenseSummaryCard {...BASE} />);

    expect(html).toContain('data-tone="neutral"');
    expect(html).toContain('9,9%');
    expect(html).toContain('313,45');
    expect(html).toContain('que setembro');
    expect(html).toContain('Setembro e o que passou dele');
  });

  it('colors the badge from 10% up', () => {
    const html = renderToStaticMarkup(<ExpenseSummaryCard {...BASE} spentCents={420000} />);
    expect(html).toContain('data-tone="bad"');
  });

  it('shows the minus sign when spending fell', () => {
    const html = renderToStaticMarkup(<ExpenseSummaryCard {...BASE} spentCents={300000} />);
    expect(html).toContain('−');
    expect(html).toContain('data-tone="neutral"');
  });

  it('writes "igual a" instead of "+R$ 0,00" when nothing differs from the month', () => {
    const html = renderToStaticMarkup(<ExpenseSummaryCard {...BASE} spentCents={317275} />);
    expect(html).toContain('igual a setembro');
    expect(html).not.toContain('0,00');
  });

  it('has no badge when the previous month had nothing at the same point', () => {
    const html = renderToStaticMarkup(<ExpenseSummaryCard {...BASE} previousSamePointCents={0} />);
    expect(html).not.toContain('data-tone');
  });
});

describe('ResultSummaryCard', () => {
  const BASE = {
    receivedCents: 380200,
    spentCents: 348620,
    previousResultCents: 20425,
    previousMonthLabel: 'setembro',
  };

  it('paints a positive result green with a plus and compares with last month', () => {
    const html = renderToStaticMarkup(<ResultSummaryCard {...BASE} />);

    expect(html).toContain('aria-label="Resultado do mês"');
    expect(html).toContain('text-gain');
    expect(html).toContain('315,80');
    expect(html).toContain('Setembro neste ponto:');
    expect(html).toContain('204,25');
    expect(html).toContain('▲');
    expect(html).toContain('bg-gain-weak');
  });

  it('shows a negative result with the minus sign and a falling badge', () => {
    const html = renderToStaticMarkup(
      <ResultSummaryCard {...BASE} receivedCents={300000} previousResultCents={20425} />,
    );

    expect(html).toContain('−');
    expect(html).toContain('▼');
    expect(html).toContain('bg-loss-weak');
  });
});

describe('linked cards', () => {
  it('makes the label a link that stretches over the whole card, with no hover effect', () => {
    const html = renderToStaticMarkup(
      <IncomeSummaryCard receivedCents={1} expectedCents={2} href="/recurrences?month=2026-10" />,
    );

    expect(html).toContain('<a ');
    expect(html).toContain('href="/recurrences?month=2026-10"');
    expect(html).toContain('after:absolute');
    expect(html).toContain('has-[[data-focus-visible]]:outline-2');
    expect(html).toContain('cursor-pointer');
    expect(html).not.toContain('hover:');
  });

  it('stays a plain card without href', () => {
    const html = renderToStaticMarkup(<IncomeSummaryCard receivedCents={1} expectedCents={2} />);

    expect(html).not.toContain('<a ');
    expect(html).not.toContain('cursor-pointer');
  });

  it('gives every card the surface box at rest, with no border', () => {
    const html = renderToStaticMarkup(<IncomeSummaryCard receivedCents={1} expectedCents={2} />);

    expect(html).toContain('bg-subtle');
    expect(html).toContain('rounded-panel');
    expect(html).not.toContain('border-line');
  });
});

describe('MonthSummaryCards', () => {
  it('puts the three cards in one named group of equal height', () => {
    const html = renderToStaticMarkup(
      <MonthSummaryCards>
        <IncomeSummaryCard receivedCents={1} expectedCents={2} />
        <ExpenseSummaryCard
          spentCents={1}
          previousSamePointCents={1}
          previousTotalCents={2}
          previousMonthLabel="setembro"
        />
        <ResultSummaryCard
          receivedCents={2}
          spentCents={1}
          previousResultCents={0}
          previousMonthLabel="setembro"
        />
      </MonthSummaryCards>,
    );

    expect(html).toContain('aria-label="Resumo do mês"');
    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html).toContain('snap-x');
    expect(html).toContain('h-full');
    expect(html).toContain('lg:gap-s16');
    expect(html).not.toContain('before:bg-line');
  });

  it('hides the values with the eye on, badges included', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value={true}>
        <ResultSummaryCard
          receivedCents={380200}
          spentCents={348620}
          previousResultCents={20425}
          previousMonthLabel="setembro"
        />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('315,80');
    expect(html).not.toContain('204,25');
  });
});

describe('MonthSummaryCard header', () => {
  it('never truncates the label: no ellipsis class, the icon yields room in a narrow card', () => {
    const html = renderToStaticMarkup(
      <ResultSummaryCard
        receivedCents={380200}
        spentCents={186900}
        previousResultCents={69530}
        previousMonthLabel="setembro"
      />,
    );
    const title = html.match(/<h3 class="([^"]*)"/);

    expect(title?.[1]).toContain('whitespace-nowrap');
    expect(title?.[1]).not.toContain('truncate');
    expect(html).toContain('@container/card');
    expect(html).toContain('@min-[17rem]/card:grid');
  });
});
