import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildApi } from '#/main/build-api.util.ts';
import { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';
import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const SECOND_ITEM_ID = '33333333-3333-4333-8333-333333333333';

// The sync against the REAL gate of the backup: the one `createAppParts` makes (`parts.gate`), with no
// double of `SyncPauseGate`, as `main` wires it. While the backup restores the database (the gate is
// active) no round of the sync reads the bank or writes the database: not the manual one, not the
// hourly one, not the one at start. Taking out either wire (`create-app-parts.util.ts`: the
// `pauseGate` of the sync; `build-api.util.ts`: the `isPaused` of the tasks) fails a test here.
describe('the sync while the backup restores the database (the real gate of createAppParts)', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld(undefined, { realGate: true });
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const hoursLater = (hours: number) => {
    world.moveTo(
      new Date(Date.parse('2026-11-09T15:00:00.000Z') + hours * 3_600_000).toISOString(),
    );
  };
  const tables = async () => ({
    runs: await world.database.db.selectFrom('sync_runs').selectAll().execute(),
    connections: await world.database.db.selectFrom('sync_connections').selectAll().execute(),
  });

  it('the manual round ("Tentar agora") answers 409 BACKUP_IN_PROGRESS, writes no run and reads nothing', async () => {
    const connection = await world.connect();
    const before = await tables();
    world.provider.calls.length = 0;
    world.parts.gate.begin();

    await world.expectError(
      await world.send('POST', `/sync/connections/${connection.id}/runs`),
      409,
      'BACKUP_IN_PROGRESS',
    );

    expect(world.provider.calls).toEqual([]);
    expect(await tables()).toEqual(before);
    expect(world.background.started).toBe(1);

    // The restore ended: the same request goes through.
    world.parts.gate.end();
    expect((await world.send('POST', `/sync/connections/${connection.id}/runs`)).status).toBe(202);
  });

  it('registering a connection and choosing accounts are refused the same way, before anything is read or written', async () => {
    const connection = await world.connect();
    world.provider.items.set(
      SECOND_ITEM_ID,
      buildTestItem({ id: SECOND_ITEM_ID, institutionName: 'Outro', institutionCode: 'other' }),
    );
    world.provider.accounts.set(SECOND_ITEM_ID, [buildTestBankAccount({ id: 'second' })]);
    const before = await tables();
    world.provider.calls.length = 0;
    world.parts.gate.begin();

    await world.expectError(
      await world.send('POST', '/sync/connections', { pluggyItemId: SECOND_ITEM_ID }),
      409,
      'BACKUP_IN_PROGRESS',
    );
    await world.expectError(
      await world.send('PUT', `/sync/connections/${connection.id}/account-matches`, {
        matches: [],
      }),
      409,
      'BACKUP_IN_PROGRESS',
    );

    expect(world.provider.calls).toEqual([]);
    expect(await tables()).toEqual(before);
  });

  it('the hourly task does not run a connection that is due: no read, no run written', async () => {
    await world.connect();
    hoursLater(2);
    const before = await tables();
    world.provider.calls.length = 0;
    world.parts.gate.begin();

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(0);
    expect(world.provider.calls).toEqual([]);
    expect(await tables()).toEqual(before);

    // The same connection runs the moment the restore ends: the gate was the only thing holding it.
    world.parts.gate.end();
    expect((await world.parts.runDueConnections.run()).ranCount).toBe(1);
  });

  // `buildApi` makes its own parts (and its own gate), so the gate is forced active at the class: the
  // wiring under test (`isPaused` of the schedule, `gate.isActive()`) is the real one.
  describe('the round at start and the hourly look (buildApi)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('with the gate active the round at start reads nothing and writes nothing; after the restore the next look runs it', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      await world.connect();
      // The connection is due: no round was ever recorded.
      await world.database.db.deleteFrom('sync_runs').execute();
      world.provider.calls.length = 0;
      const active = vi.spyOn(MaintenanceGate.prototype, 'isActive').mockReturnValue(true);

      const api = await buildApi({
        db: world.database.db,
        localToken: 'token',
        clock: world.clock,
        sync: {
          provider: world.provider,
          cipher: world.cipher,
          background: world.background,
          // The use cases of the sync do not ask the gate here, so only the `isPaused` that `buildApi`
          // gives the schedule can hold the look back (the use cases have their own tests above).
          pauseGate: { isPaused: () => false },
        },
      });
      await api.syncInitialRun;
      await vi.advanceTimersByTimeAsync(130_000);

      expect(world.provider.calls).toEqual([]);
      expect(await world.database.db.selectFrom('sync_runs').selectAll().execute()).toEqual([]);

      active.mockReturnValue(false);
      await vi.advanceTimersByTimeAsync(65_000);
      api.stop();

      expect(world.provider.calls).toContain(`getItem:${SYNC_TEST_ITEM_ID}`);
      expect(await world.database.db.selectFrom('sync_runs').select('trigger').execute()).toEqual([
        { trigger: 'schedule' },
      ]);
    });
  });
});
