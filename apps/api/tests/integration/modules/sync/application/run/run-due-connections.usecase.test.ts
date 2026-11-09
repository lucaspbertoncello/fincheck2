import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSyncTestWorld } from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestBankTransaction,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const SECOND_ITEM_ID = '33333333-3333-4333-8333-333333333333';

describe('the scheduled round (RunDueConnectionsUseCase) and the round at start', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
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

  it('runs the connection whose last round began more than an hour ago, with trigger schedule', async () => {
    const connection = await world.connect();
    hoursLater(1.01);

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(1);
    expect((await world.runsOf(connection.id))[0]).toMatchObject({
      trigger: 'schedule',
      status: 'success',
    });
  });

  it('leaves alone a connection whose last round was less than an hour ago (the task looks every minute)', async () => {
    await world.connect();
    hoursLater(0.9);
    world.provider.calls.length = 0;

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(0);
    expect(world.provider.calls).toEqual([]);
  });

  // Each decryption of the secret is a PowerShell (about 300 ms): the look of every minute must not
  // pay it when nothing is due, and a round of several connections pays it once.
  it('does not decrypt the secret when no connection is due', async () => {
    await world.connect();
    hoursLater(0.5);
    const before = world.cipher.decryptCount;

    expect((await world.parts.runDueConnections.run()).ranCount).toBe(0);

    expect(world.cipher.decryptCount).toBe(before);
  });

  it('decrypts the secret once for a whole round, however many connections are due', async () => {
    await world.connect();
    world.provider.items.set(
      SECOND_ITEM_ID,
      buildTestItem({ id: SECOND_ITEM_ID, institutionName: 'Outro', institutionCode: 'other' }),
    );
    world.provider.accounts.set(SECOND_ITEM_ID, [
      buildTestBankAccount({ id: 'second-checking', numberHint: '0001' }),
    ]);
    await world.connect(SECOND_ITEM_ID);
    hoursLater(2);
    const before = world.cipher.decryptCount;

    expect((await world.parts.runDueConnections.run()).ranCount).toBe(2);

    expect(world.cipher.decryptCount - before).toBe(1);
  });

  it('"Tentar agora" and "Conectar" decrypt the secret once each (the round reuses the keys of the request)', async () => {
    const before = world.cipher.decryptCount;
    const connection = await world.connect();
    expect(world.cipher.decryptCount - before).toBe(1);

    world.moveTo('2026-11-09T18:00:00.000Z');
    const beforeRetry = world.cipher.decryptCount;
    await world.retry(connection.id);

    expect(world.cipher.decryptCount - beforeRetry).toBe(1);
  });

  it('a connection that never ran is due at once', async () => {
    const connection = await world.connect();
    await world.database.db.deleteFrom('sync_runs').execute();

    expect((await world.parts.runDueConnections.run()).ranCount).toBe(1);
    expect(await world.runsOf(connection.id)).toHaveLength(1);
  });

  it('does not run without keys saved', async () => {
    await world.connect();
    await world.database.db.deleteFrom('sync_settings').execute();
    hoursLater(2);
    world.provider.calls.length = 0;

    expect((await world.parts.runDueConnections.run()).ranCount).toBe(0);
    expect(world.provider.calls).toEqual([]);
  });

  it('does not run when the secret does not decrypt on this PC', async () => {
    await world.connect();
    world.cipher.breakDecrypt();
    hoursLater(2);

    expect((await world.parts.runDueConnections.run()).ranCount).toBe(0);
  });

  it('while the backup restores the database (paused) no round runs and nothing is read or written', async () => {
    const connection = await world.connect();
    world.gate.paused = true;
    hoursLater(2);
    world.provider.calls.length = 0;

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(0);
    expect(world.provider.calls).toEqual([]);
    expect(await world.runsOf(connection.id)).toHaveLength(1);
  });

  it('skips a connection that already has a round running, and goes on to the others', async () => {
    const first = await world.connect();
    world.provider.items.set(
      SECOND_ITEM_ID,
      buildTestItem({ id: SECOND_ITEM_ID, institutionName: 'Outro', institutionCode: 'other' }),
    );
    world.provider.accounts.set(SECOND_ITEM_ID, [
      buildTestBankAccount({ id: 'second-checking', numberHint: '0001' }),
    ]);
    const second = await world.connect(SECOND_ITEM_ID);
    hoursLater(2);
    await world.database.db
      .insertInto('sync_runs')
      .values({
        id: '019a0000-0000-7000-8000-000000000001',
        connection_id: first.id,
        trigger: 'schedule',
        started_at: '2026-11-09T16:59:00.000Z',
        finished_at: null,
        status: 'running',
        error_code: null,
        created_count: 0,
        updated_count: 0,
        removed_count: 0,
      })
      .execute();

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(1);
    expect((await world.runsOf(second.id))[0]).toMatchObject({ trigger: 'schedule' });
    expect((await world.runsOf(first.id)).filter((run) => run.trigger === 'schedule')).toHaveLength(
      1,
    );
  });

  it('a connection that fails does not stop the others, and the failure is recorded in its run', async () => {
    const first = await world.connect();
    world.provider.items.set(
      SECOND_ITEM_ID,
      buildTestItem({ id: SECOND_ITEM_ID, institutionName: 'Outro', institutionCode: 'other' }),
    );
    world.provider.accounts.set(SECOND_ITEM_ID, [
      buildTestBankAccount({ id: 'second-checking', numberHint: '0001' }),
    ]);
    const second = await world.connect(SECOND_ITEM_ID);
    world.provider.transactions.set('second-checking', [buildTestBankTransaction({ id: 's1' })]);
    world.provider.fail('listTransactions', 'unavailable');
    hoursLater(2);

    const { ranCount } = await world.parts.runDueConnections.run();

    expect(ranCount).toBe(2);
    expect((await world.runsOf(first.id))[0]).toMatchObject({
      status: 'error',
      errorCode: 'PROVIDER_ERROR',
    });
    expect((await world.runsOf(second.id))[0]).toMatchObject({
      status: 'error',
      errorCode: 'PROVIDER_ERROR',
    });
  });

  it('a round the API died in is closed as an error at start (recoverInterruptedRuns), so it holds nothing', async () => {
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

    const { recoveredCount } = await world.parts.recoverInterruptedRuns.execute();

    expect(recoveredCount).toBe(1);
    expect(
      (await world.runsOf(connection.id)).find(
        (run) => run.id === '019a0000-0000-7000-8000-000000000001',
      ),
    ).toMatchObject({
      status: 'error',
      errorCode: 'PROVIDER_ERROR',
    });
  });
});
