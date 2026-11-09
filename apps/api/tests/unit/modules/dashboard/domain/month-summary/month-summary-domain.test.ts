import { describe, expect, it } from 'vitest';

import type { AgendaOccurrence } from '#/modules/dashboard/domain/agenda/agenda-occurrence.type.ts';
import { isConnectionStale } from '#/modules/dashboard/domain/free-balance/is-connection-stale.util.ts';
import { buildMonthAlerts } from '#/modules/dashboard/domain/month-summary/build-month-alerts.util.ts';
import { computeDaysLate } from '#/modules/dashboard/domain/month-summary/compute-days-late.util.ts';
import { computeIncomeExpectation } from '#/modules/dashboard/domain/month-summary/compute-income-expectation.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

describe('computeIncomeExpectation', () => {
  const occurrence = (
    expectedCents: number,
    receivedCents: number,
    categoryId: string | null,
    ids: string[] = [],
  ) => ({
    expectedCents,
    receivedCents,
    categoryId,
    paymentTransactionIds: ids,
  });

  it('is the sum of the expected amounts when nothing was received beyond them: R$ 8.427,00 of the contract', () => {
    const result = computeIncomeExpectation({
      occurrences: [
        occurrence(120000, 120000, 'salary', ['t1']),
        occurrence(140000, 140000, 'salary', ['t2']),
        occurrence(420000, 0, 'maxxy'),
        occurrence(85000, 42500, 'mesada', ['t3']),
        occurrence(77700, 77700, 'vr', ['t4']),
      ],
      monthIncome: [
        { transactionId: 't1', cents: 120000, categoryId: 'salary' },
        { transactionId: 't2', cents: 140000, categoryId: 'salary' },
        { transactionId: 't3', cents: 42500, categoryId: 'mesada' },
        { transactionId: 't4', cents: 77700, categoryId: 'vr' },
      ],
    });

    expect(result.totalCents).toBe(842700);
    expect(result.byCategory.get('salary')).toBe(260000);
    expect(result.byCategory.get('mesada')).toBe(85000);
  });

  it('counts the larger of what was expected and what was received (a raise), so it never shows more received than expected', () => {
    const result = computeIncomeExpectation({
      occurrences: [occurrence(500000, 520000, 'salary', ['t1'])],
      monthIncome: [{ transactionId: 't1', cents: 520000, categoryId: 'salary' }],
    });

    expect(result.totalCents).toBe(520000);
  });

  it('adds the income no occurrence took in to the expectation, in its own category: it only arrived', () => {
    const result = computeIncomeExpectation({
      occurrences: [occurrence(100000, 0, 'salary')],
      monthIncome: [
        { transactionId: 'pix', cents: 5000, categoryId: null },
        { transactionId: 'gift', cents: 2000, categoryId: 'gifts' },
      ],
    });

    expect(result.totalCents).toBe(107000);
    expect(result.byCategory.get(null)).toBe(5000);
    expect(result.byCategory.get('gifts')).toBe(2000);
  });

  it('is zero with nothing at all', () => {
    expect(computeIncomeExpectation({ occurrences: [], monthIncome: [] })).toEqual({
      totalCents: 0,
      byCategory: new Map(),
    });
  });
});

describe('computeDaysLate', () => {
  const today = BusinessDate.of('2026-10-22');

  it('counts from the end of the window: the day after is 1, the same day or earlier is 0', () => {
    expect(computeDaysLate('2026-10-20', today)).toBe(2);
    expect(computeDaysLate('2026-10-21', today)).toBe(1);
    expect(computeDaysLate('2026-10-22', today)).toBe(0);
    expect(computeDaysLate('2026-10-30', today)).toBe(0);
    expect(computeDaysLate('2026-09-22', today)).toBe(30);
  });

  it('crosses the end of a month and a leap day', () => {
    expect(computeDaysLate('2028-02-28', BusinessDate.of('2028-03-01'))).toBe(2);
    expect(computeDaysLate('2026-02-28', BusinessDate.of('2026-03-01'))).toBe(1);
  });
});

describe('isConnectionStale', () => {
  const now = '2026-10-22T15:00:00.000Z';

  it('is stale after 36 hours, not at 36 hours, and never before the first update', () => {
    expect(isConnectionStale('2026-10-21T03:00:00.000Z', now)).toBe(false);
    expect(isConnectionStale('2026-10-21T02:59:59.999Z', now)).toBe(true);
    expect(isConnectionStale('2026-10-22T13:00:00.000Z', now)).toBe(false);
    expect(isConnectionStale(null, now)).toBe(false);
  });
});

describe('buildMonthAlerts', () => {
  const today = BusinessDate.of('2026-10-22');
  const connections = [
    { connectionId: 'c1', institutionName: 'Bradesco', status: 'error' as const, isStale: true },
    { connectionId: 'c2', institutionName: 'Nubank', status: 'active' as const, isStale: true },
    { connectionId: 'c3', institutionName: 'Inter', status: 'active' as const, isStale: false },
    {
      connectionId: 'c4',
      institutionName: 'Sicredi',
      status: 'disconnected' as const,
      isStale: true,
    },
  ];
  const late = (id: string, name: string, windowEndOn: string): AgendaOccurrence =>
    ({ id, recurrenceName: name, status: 'late', windowEndOn }) as AgendaOccurrence;

  it('orders the connection error, the data that stopped and the late ones, the most days late first', () => {
    const alerts = buildMonthAlerts({
      isCurrentMonth: true,
      today,
      connections,
      occurrences: [
        late('o1', 'Maxxy', '2026-10-20'),
        late('o2', 'Diarista', '2026-10-05'),
        {
          id: 'o3',
          recurrenceName: 'Netflix',
          status: 'expected',
          windowEndOn: '2026-10-28',
        } as AgendaOccurrence,
      ],
    });

    expect(
      alerts.map((alert) => [alert.type, alert.connectionId ?? alert.occurrenceId, alert.daysLate]),
    ).toEqual([
      ['connection_error', 'c1', null],
      ['stale_data', 'c2', null],
      ['late_occurrence', 'o2', 17],
      ['late_occurrence', 'o1', 2],
    ]);
    expect(alerts[0]).toEqual({
      type: 'connection_error',
      connectionId: 'c1',
      institutionName: 'Bradesco',
      occurrenceId: null,
      recurrenceName: null,
      daysLate: null,
    });
  });

  it('leaves the connection alerts out of a month that is not the current one, keeping the late ones', () => {
    const alerts = buildMonthAlerts({
      isCurrentMonth: false,
      today,
      connections,
      occurrences: [late('o1', 'Maxxy', '2026-09-20')],
    });

    expect(alerts.map((alert) => alert.type)).toEqual(['late_occurrence']);
  });

  it('is empty when nothing is out of the ordinary', () => {
    expect(
      buildMonthAlerts({
        isCurrentMonth: true,
        today,
        connections: [connections[2]!],
        occurrences: [],
      }),
    ).toEqual([]);
  });
});
