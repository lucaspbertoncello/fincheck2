import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import { Run } from '#/modules/sync/domain/run/run.entity.ts';
import { KyselyConnectionRepository } from '#/modules/sync/infra/connection/connection.repository.ts';
import { KyselyRunRepository } from '#/modules/sync/infra/run/run.repository.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const hour = (index: number) =>
  new Date(Date.parse('2026-11-01T00:00:00.000Z') + index * 3_600_000).toISOString();

describe('KyselyRunRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let runs: KyselyRunRepository;
  let connectionId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    runs = new KyselyRunRepository(database.db);
    const connection = Connection.register(
      {
        pluggyItemId: 'item-1',
        institutionCode: 'nubank',
        institutionName: 'Nubank',
        lastBankUpdateAt: null,
      },
      hour(0),
    );
    await new KyselyConnectionRepository(database.db).save(connection);
    connectionId = connection.id;
  });

  afterEach(async () => {
    await database.destroy();
  });

  const start = async (index: number, trigger: 'schedule' | 'retry' = 'schedule') => {
    const run = Run.start({ connectionId, trigger }, hour(index));
    await runs.save(run);

    return run;
  };

  it('saves and reads a run, and the update when it ends', async () => {
    const run = await start(1);
    expect(await runs.findById(run.id)).toMatchObject({ status: 'running', finishedAt: null });

    run.succeed({ createdCount: 4, updatedCount: 2, removedCount: 1 }, hour(2));
    await runs.save(run);

    expect(await runs.findById(run.id)).toMatchObject({
      status: 'success',
      finishedAt: hour(2),
      createdCount: 4,
      updatedCount: 2,
      removedCount: 1,
    });
    expect(await runs.findById('nope')).toBeNull();
  });

  it('lists the most recent first, up to the limit', async () => {
    for (let index = 1; index <= 5; index++) await start(index);

    const recent = await runs.listRecent(connectionId, 3);

    expect(recent.map((run) => run.startedAt)).toEqual([hour(5), hour(4), hour(3)]);
  });

  it('finds the run in progress, but not one that started before `since` (the process died in it)', async () => {
    const running = await start(10);

    expect((await runs.findRunning(connectionId, hour(9)))?.id).toBe(running.id);
    expect(await runs.findRunning(connectionId, hour(11))).toBeNull();
  });

  it('a run that ended is not in progress', async () => {
    const run = await start(10);
    run.fail('PROVIDER_ERROR', hour(11));
    await runs.save(run);

    expect(await runs.findRunning(connectionId, hour(0))).toBeNull();
  });

  it('answers the latest run of each connection', async () => {
    await start(1);
    const latest = await start(3, 'retry');
    await start(2);

    const found = await runs.findLatestOf([connectionId, 'other']);

    expect([...found.keys()]).toEqual([connectionId]);
    expect(found.get(connectionId)?.id).toBe(latest.id);
    expect((await runs.findLatestOf([])).size).toBe(0);
  });

  it('trims to the last N and leaves alone what is within it', async () => {
    for (let index = 1; index <= 10; index++) await start(index);

    await runs.trim(connectionId, 20);
    expect(await runs.listRecent(connectionId, 50)).toHaveLength(10);

    await runs.trim(connectionId, 4);
    expect((await runs.listRecent(connectionId, 50)).map((run) => run.startedAt)).toEqual([
      hour(10),
      hour(9),
      hour(8),
      hour(7),
    ]);
  });

  it('closes as an error the runs still running that started up to `before`, and counts them', async () => {
    const old = await start(1);
    const recent = await start(5);
    const done = await start(2);
    done.succeed({ createdCount: 0, updatedCount: 0, removedCount: 0 }, hour(3));
    await runs.save(done);

    const count = await runs.failInterrupted(hour(4), hour(6));

    expect(count).toBe(1);
    expect(await runs.findById(old.id)).toMatchObject({
      status: 'error',
      errorCode: 'PROVIDER_ERROR',
      finishedAt: hour(6),
    });
    expect((await runs.findById(recent.id))?.status).toBe('running');
    expect((await runs.findById(done.id))?.status).toBe('success');
  });

  it('the runs go with the connection', async () => {
    await start(1);

    await database.db.deleteFrom('sync_connections').execute();

    expect(await database.db.selectFrom('sync_runs').selectAll().execute()).toEqual([]);
  });
});
