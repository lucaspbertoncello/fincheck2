import { describe, expect, it } from 'vitest';

import type { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import type { ConnectionReader } from '#/modules/dashboard/application/connection/connection-reader.interface.ts';
import { GetFreeBalanceQuery } from '#/modules/dashboard/application/free-balance/get-free-balance.query.ts';
import { GetMonthSummaryQuery } from '#/modules/dashboard/application/month-summary/get-month-summary.query.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

// The connections of `sync` are the port of `dashboard` that `createApp` does not plug in yet, so
// they are tested here, on the queries, with a reader that answers what `sync` will answer.
const clock = createFixedClock('2026-10-22T15:00:00.000Z');
const loader = {
  load: () =>
    Promise.resolve({
      today: BusinessDate.of('2026-10-22'),
      accounts: [],
      entries: [],
      occurrences: [],
    }),
} as unknown as AgendaLoader;
const reviews = {
  countByAccount: () => Promise.resolve([]),
  countInPeriod: () => Promise.resolve({ count: 0, totalCents: 0 }),
};
const lines = { listLines: () => Promise.resolve([]) };
const occurrences = {
  listOfMonth: () => Promise.resolve([]),
  listOpenDueBy: () => Promise.resolve([]),
  listSettledAround: () => Promise.resolve([]),
};

const connections: ConnectionReader = {
  listConnections: () =>
    Promise.resolve([
      {
        connectionId: 'c1',
        institutionName: 'Bradesco',
        status: 'error',
        lastBankUpdateAt: '2026-10-22T12:00:00.000Z',
      },
      {
        connectionId: 'c2',
        institutionName: 'Nubank',
        status: 'active',
        lastBankUpdateAt: '2026-10-20T12:00:00.000Z',
      },
      {
        connectionId: 'c3',
        institutionName: 'Inter',
        status: 'active',
        lastBankUpdateAt: '2026-10-22T14:00:00.000Z',
      },
      {
        connectionId: 'c4',
        institutionName: 'Sicredi',
        status: 'disconnected',
        lastBankUpdateAt: null,
      },
    ]),
};

describe('the connections in the Livre and in the summary', () => {
  it('shows the freshness of each connection that is not disconnected, with the stale seal calculated on reading', async () => {
    const dto = await new GetFreeBalanceQuery(loader, reviews, connections, clock).execute();

    expect(dto.dataFreshness).toEqual([
      {
        connectionId: 'c1',
        institutionName: 'Bradesco',
        status: 'error',
        lastBankUpdateAt: '2026-10-22T12:00:00.000Z',
        isStale: false,
      },
      {
        connectionId: 'c2',
        institutionName: 'Nubank',
        status: 'active',
        lastBankUpdateAt: '2026-10-20T12:00:00.000Z',
        isStale: true,
      },
      {
        connectionId: 'c3',
        institutionName: 'Inter',
        status: 'active',
        lastBankUpdateAt: '2026-10-22T14:00:00.000Z',
        isStale: false,
      },
    ]);
  });

  it('has no freshness without the reader of sync', async () => {
    expect(
      (await new GetFreeBalanceQuery(loader, reviews, undefined, clock).execute()).dataFreshness,
    ).toEqual([]);
  });

  it('raises the connection error and the stale data as alerts, in this order, only in the current month', async () => {
    const summary = (month: string) =>
      new GetMonthSummaryQuery(loader, occurrences, lines, connections, clock).execute({ month });

    expect(
      (await summary('2026-10')).alerts.map((alert) => [
        alert.type,
        alert.connectionId,
        alert.institutionName,
      ]),
    ).toEqual([
      ['connection_error', 'c1', 'Bradesco'],
      ['stale_data', 'c2', 'Nubank'],
    ]);
    expect((await summary('2026-09')).alerts).toEqual([]);
  });
});
