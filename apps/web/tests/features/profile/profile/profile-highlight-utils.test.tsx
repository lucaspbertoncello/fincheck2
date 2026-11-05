import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildHighlightItems } from '#/features/profile/profile/utils/build-highlight-items.util.tsx';
import { formatCounterpartyName } from '#/features/profile/profile/utils/format-counterparty-name.util.ts';
import { formatHighlightDay } from '#/features/profile/profile/utils/format-highlight-day.util.ts';
import { formatHighlightMonth } from '#/features/profile/profile/utils/format-highlight-month.util.ts';
import { formatStreakRange } from '#/features/profile/profile/utils/format-streak-range.util.ts';

const TODAY = '2026-10-22';

describe('formatHighlightDay', () => {
  it('leaves the year out of this year and adds it for the others', () => {
    expect(formatHighlightDay('2026-03-12', TODAY)).toBe('12 mar');
    expect(formatHighlightDay('2026-03-02', TODAY)).toBe('2 mar');
    expect(formatHighlightDay('2025-11-03', TODAY)).toBe('3 nov 2025');
  });
});

describe('formatHighlightMonth', () => {
  it('writes the month in full with the year', () => {
    expect(formatHighlightMonth('2026-03')).toBe('Março de 2026');
    expect(formatHighlightMonth('2025-12')).toBe('Dezembro de 2025');
  });
});

describe('formatStreakRange', () => {
  it('shares the month inside one month and names both across two', () => {
    expect(formatStreakRange('2026-05-02', '2026-05-05', TODAY)).toBe('2 a 5 mai');
    expect(formatStreakRange('2026-04-28', '2026-05-02', TODAY)).toBe('28 abr a 2 mai');
    expect(formatStreakRange('2026-05-09', '2026-05-09', TODAY)).toBe('9 mai');
  });
});

describe('formatCounterpartyName', () => {
  it('turns the printed capitals into a name, keeping the small words small', () => {
    expect(formatCounterpartyName('RAFAEL MOURA')).toBe('Rafael Moura');
    expect(formatCounterpartyName('JOSE C DA SILVA')).toBe('Jose C da Silva');
    expect(formatCounterpartyName('  JULIA   TAVARES ')).toBe('Julia Tavares');
  });

  it('leaves a name that already has lowercase letters alone', () => {
    expect(formatCounterpartyName('Júlia Tavares')).toBe('Júlia Tavares');
  });
});

describe('buildHighlightItems', () => {
  const none = (): undefined => undefined;

  it('always gives the six cards in the same order, empty without data', () => {
    const items = buildHighlightItems({ highlights: null, categoryName: none, today: TODAY });

    expect(items.map((item) => item.key)).toEqual([
      'largestPixSent',
      'largestPixReceived',
      'topCategory',
      'costliestMonth',
      'costliestWeekday',
      'longestNoSpendStreak',
    ]);
    expect(items.every((item) => item.value === null && item.context === null)).toBe(true);
  });

  it('writes the Pix context with the name when there is one and with the date alone when not', () => {
    const items = buildHighlightItems({
      highlights: {
        largestPixSent: {
          amountCents: 1000,
          counterparty: 'RAFAEL MOURA',
          occurredOn: '2026-03-12',
          transactionId: 'a',
        },
        largestPixReceived: {
          amountCents: 1000,
          counterparty: null,
          occurredOn: '2026-03-12',
          transactionId: 'b',
        },
        topCategory: null,
        costliestMonth: null,
        costliestWeekday: null,
        longestNoSpendStreak: null,
      },
      categoryName: none,
      today: TODAY,
    });

    expect(items[0]?.context).toEqual({ lead: 'para Rafael Moura', tail: '12 mar' });
    expect(items[1]?.context).toEqual({ lead: undefined, tail: '12 mar' });
  });

  it('names the category, falls back when it is unknown and writes the share with a comma', () => {
    const highlights = {
      largestPixSent: null,
      largestPixReceived: null,
      topCategory: { categoryId: 'c1', totalCents: 500, sharePercent: 31.4 },
      costliestMonth: null,
      costliestWeekday: { weekday: 0, averageCents: 100 },
      longestNoSpendStreak: { days: 1, from: '2026-05-02', to: '2026-05-02' },
    };

    const known = buildHighlightItems({
      highlights,
      categoryName: (id) => (id === 'c1' ? 'Mercado' : undefined),
      today: TODAY,
    });
    expect(known[2]?.context).toEqual({ lead: 'Mercado', tail: '31,4% do gasto' });
    expect(known[4]?.context).toEqual({ lead: 'Domingo', tail: 'média por dia' });
    expect(known[5]?.context).toEqual({ tail: '2 mai' });

    const unknown = buildHighlightItems({ highlights, categoryName: none, today: TODAY });
    expect(unknown[2]?.context?.lead).toBe('Sem categoria');
  });

  it('writes the streak as days in the singular and the plural', () => {
    const build = (days: number) =>
      buildHighlightItems({
        highlights: {
          largestPixSent: null,
          largestPixReceived: null,
          topCategory: null,
          costliestMonth: null,
          costliestWeekday: null,
          longestNoSpendStreak: { days, from: '2026-05-02', to: '2026-05-03' },
        },
        categoryName: none,
        today: TODAY,
      })[5]?.value;

    const one = render(<p>{build(1)}</p>);
    expect(one.container).toHaveTextContent(/^1\s?dia$/);
    one.unmount();
    const many = render(<p>{build(12)}</p>);
    expect(many.container).toHaveTextContent(/^12\s?dias$/);
  });
});
