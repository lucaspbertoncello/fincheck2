import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';

// The port `ConnectionReader` of `dashboard` is plugged by `main` to the connections of `sync`. If
// it is left out, `dataFreshness` and the alerts are always empty: these tests fail.
describe('dashboard reading the connections of sync', () => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const connectionId = (n: number) => `0000000${n}-0000-4000-8000-000000000000`;

  const insertConnection = (
    n: number,
    overrides: { status: 'active' | 'error' | 'disconnected'; lastBankUpdateAt: string | null },
  ) =>
    world.db
      .insertInto('sync_connections')
      .values({
        id: connectionId(n),
        pluggy_item_id: `pluggy-item-${n}`.padEnd(36, '0'),
        institution_code: 'other',
        institution_name: `Banco ${n}`,
        status: overrides.status,
        error_code: overrides.status === 'error' ? 'LOGIN_ERROR' : null,
        last_bank_update_at: overrides.lastBankUpdateAt,
        last_success_at: overrides.lastBankUpdateAt,
        history_status: 'done',
        history_from_on: null,
        created_at: '2026-10-01T12:00:00.000Z',
        updated_at: '2026-10-01T12:00:00.000Z',
      })
      .execute();

  it('shows the connections in the freshness seal, the stale one marked and the disconnected left out', async () => {
    await insertConnection(1, {
      status: 'active',
      lastBankUpdateAt: '2026-10-22T10:00:00.000Z',
    });
    await insertConnection(2, {
      status: 'active',
      lastBankUpdateAt: '2026-10-19T10:00:00.000Z',
    });
    await insertConnection(3, { status: 'disconnected', lastBankUpdateAt: null });

    const dto = await world.get('/dashboard/free-balance', freeBalanceDtoSchema);

    expect(dto.dataFreshness).toHaveLength(2);
    expect(dto.dataFreshness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ institutionName: 'Banco 1', isStale: false }),
        expect.objectContaining({ institutionName: 'Banco 2', isStale: true }),
      ]),
    );
  });

  it('raises the alerts of a connection in error and of stale data in the summary of the month', async () => {
    await insertConnection(4, {
      status: 'error',
      lastBankUpdateAt: '2026-10-22T10:00:00.000Z',
    });
    await insertConnection(2, {
      status: 'active',
      lastBankUpdateAt: '2026-10-19T10:00:00.000Z',
    });

    const dto = await world.get('/dashboard/month-summary?month=2026-10', monthSummaryDtoSchema);

    expect(dto.alerts.map((alert) => alert.type)).toEqual(['connection_error', 'stale_data']);
    expect(dto.alerts[0]).toMatchObject({ institutionName: 'Banco 4' });
  });
});
