import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankTransaction,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const MISSING = '019a0000-0000-7000-8000-000000000000';

describe('the routes of /sync/connections/:id/runs', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  describe('GET', () => {
    it('lists the runs of the connection, the newest first, with the counts', async () => {
      world.provider.transactions.set('pluggy-account-checking', [buildTestBankTransaction()]);
      const connection = await world.connect();
      world.moveTo('2026-11-09T16:00:00.000Z');
      await world.retry(connection.id);

      const runs = await world.runsOf(connection.id);

      expect(runs.map((run) => [run.trigger, run.status])).toEqual([
        ['retry', 'success'],
        ['first_connection', 'success'],
      ]);
      expect(runs[1]).toMatchObject({ createdCount: 1, updatedCount: 0, removedCount: 0 });
      expect(runs[0]).toMatchObject({ createdCount: 0, startedAt: '2026-11-09T16:00:00.000Z' });
    });

    it('shows at most the last 20', async () => {
      const connection = await world.connect();
      for (let hour = 0; hour < 22; hour++) {
        world.moveTo(
          new Date(Date.parse('2026-11-09T16:00:00.000Z') + hour * 3_600_000).toISOString(),
        );
        await world.retry(connection.id);
      }

      const runs = await world.runsOf(connection.id);

      expect(runs).toHaveLength(20);
      expect(runs[0]?.startedAt).toBe('2026-11-10T13:00:00.000Z');
    });

    it('answers an empty list for a connection that never ran', async () => {
      const connection = await world.connect();
      await world.database.db.deleteFrom('sync_runs').execute();

      expect(await world.runsOf(connection.id)).toEqual([]);
    });

    it('answers 404 SYNC_CONNECTION_NOT_FOUND', async () => {
      await world.expectError(
        await world.send('GET', `/sync/connections/${MISSING}/runs`),
        404,
        'SYNC_CONNECTION_NOT_FOUND',
      );
    });

    it('answers 400 for an id that is not a uuid', async () => {
      expect((await world.send('GET', '/sync/connections/nope/runs')).status).toBe(400);
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send('GET', `/sync/connections/${MISSING}/runs`, undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('POST (Tentar agora)', () => {
    it('answers 202 with the run running; the round goes on and ends in success, and the connection stays active', async () => {
      const connection = await world.connect();

      const response = await world.send('POST', `/sync/connections/${connection.id}/runs`);
      const run = (await response.json()) as {
        trigger: string;
        status: string;
        finishedAt: unknown;
      };
      await world.background.settled();

      expect(response.status).toBe(202);
      expect(run).toMatchObject({ trigger: 'retry', status: 'running', finishedAt: null });
      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        trigger: 'retry',
        status: 'success',
      });
    });

    it('a round that fails keeps the connection in error with the new code, and the run records the translated code', async () => {
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'CONSENT_REVOKED' }),
      );
      await world.retry(connection.id);
      expect(await world.connectionsOf()).toMatchObject([
        { status: 'error', errorCode: 'CONSENT_REVOKED' },
      ]);

      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'LOGIN_ERROR' }),
      );
      await world.retry(connection.id);

      expect(await world.connectionsOf()).toMatchObject([
        { status: 'error', errorCode: 'LOGIN_ERROR' },
      ]);
      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        status: 'error',
        errorCode: 'LOGIN_ERROR',
        createdCount: 0,
      });
    });

    it('a round that succeeds brings the connection back to active', async () => {
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'LOGIN_ERROR' }),
      );
      await world.retry(connection.id);

      world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
      await world.retry(connection.id);

      expect(await world.connectionsOf()).toMatchObject([{ status: 'active', errorCode: null }]);
    });

    it('answers 404 SYNC_CONNECTION_NOT_FOUND', async () => {
      await world.expectError(
        await world.send('POST', `/sync/connections/${MISSING}/runs`),
        404,
        'SYNC_CONNECTION_NOT_FOUND',
      );
    });

    it('answers 422 SYNC_CONNECTION_DISCONNECTED for a connection that was disconnected', async () => {
      const connection = await world.connect();
      await world.send('DELETE', `/sync/connections/${connection.id}`);

      await world.expectError(
        await world.send('POST', `/sync/connections/${connection.id}/runs`),
        422,
        'SYNC_CONNECTION_DISCONNECTED',
      );
    });

    it('answers 422 SYNC_NOT_CONFIGURED when the keys are not saved any more (secret that does not decrypt)', async () => {
      const connection = await world.connect();
      world.cipher.breakDecrypt();

      await world.expectError(
        await world.send('POST', `/sync/connections/${connection.id}/runs`),
        422,
        'SYNC_NOT_CONFIGURED',
      );
      expect(await world.runsOf(connection.id)).toHaveLength(1);
    });

    it('answers 409 SYNC_RUN_IN_PROGRESS while a round runs on the connection, and starts no other', async () => {
      const connection = await world.connect();
      await world.database.db
        .insertInto('sync_runs')
        .values({
          id: '019a0000-0000-7000-8000-000000000001',
          connection_id: connection.id,
          trigger: 'schedule',
          started_at: '2026-11-09T14:59:00.000Z',
          finished_at: null,
          status: 'running',
          error_code: null,
          created_count: 0,
          updated_count: 0,
          removed_count: 0,
        })
        .execute();
      const startedBefore = world.background.started;

      await world.expectError(
        await world.send('POST', `/sync/connections/${connection.id}/runs`),
        409,
        'SYNC_RUN_IN_PROGRESS',
      );

      expect(world.background.started).toBe(startedBefore);
    });

    it('a round the API died in (running for more than 30 minutes) does not hold the connection', async () => {
      const connection = await world.connect();
      await world.database.db
        .insertInto('sync_runs')
        .values({
          id: '019a0000-0000-7000-8000-000000000001',
          connection_id: connection.id,
          trigger: 'schedule',
          started_at: '2026-11-09T13:00:00.000Z',
          finished_at: null,
          status: 'running',
          error_code: null,
          created_count: 0,
          updated_count: 0,
          removed_count: 0,
        })
        .execute();

      const response = await world.send('POST', `/sync/connections/${connection.id}/runs`);

      expect(response.status).toBe(202);
      await world.background.settled();
      const runs = await world.runsOf(connection.id);
      expect(runs.find((run) => run.id === '019a0000-0000-7000-8000-000000000001')).toMatchObject({
        status: 'error',
        errorCode: 'PROVIDER_ERROR',
      });
    });

    it('answers 400 for an id that is not a uuid', async () => {
      expect((await world.send('POST', '/sync/connections/nope/runs')).status).toBe(400);
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send('POST', `/sync/connections/${MISSING}/runs`, undefined, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });

    it('while the backup restores the database (the gate is paused) it answers 409 BACKUP_IN_PROGRESS, writes no run and reads nothing', async () => {
      const connection = await world.connect();
      world.gate.paused = true;
      world.provider.calls.length = 0;

      await world.expectError(
        await world.send('POST', `/sync/connections/${connection.id}/runs`),
        409,
        'BACKUP_IN_PROGRESS',
      );

      expect(world.provider.calls).toEqual([]);
      expect(await world.runsOf(connection.id)).toHaveLength(1);
      expect(await world.connectionsOf()).toMatchObject([{ status: 'active' }]);
    });

    it('a round that began before the gate closed and finds it paused when it goes on does not write: the run stays as it was', async () => {
      const connection = await world.connect();
      world.background.hold = true;
      const response = await world.send('POST', `/sync/connections/${connection.id}/runs`);
      expect(response.status).toBe(202);
      world.gate.paused = true;
      world.provider.calls.length = 0;

      await world.background.settled();

      expect(world.provider.calls).toEqual([]);
      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        trigger: 'retry',
        status: 'running',
        finishedAt: null,
      });
    });
  });
});
