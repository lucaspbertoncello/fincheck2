import BetterSqlite3 from 'better-sqlite3';
import { sql, type Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('KyselyUnitOfWork', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let unitOfWork: KyselyUnitOfWork;

  beforeEach(async () => {
    database = await createTestDatabase();
    unitOfWork = new KyselyUnitOfWork(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const insertTag = (executor: Kysely<Database>, name: string) =>
    executor
      .insertInto('tags')
      .values({
        id: generateId(),
        name,
        archived_at: null,
        created_at: '2026-11-06T12:00:00.000Z',
        updated_at: '2026-11-06T12:00:00.000Z',
      })
      .execute();

  const countTags = async () =>
    (await database.db.selectFrom('tags').select('id').execute()).length;

  it('commits what the work wrote and returns its result', async () => {
    const result = await unitOfWork.run(async (executor) => {
      await insertTag(executor, 'viagem');
      await insertTag(executor, 'casa');
      return 'done';
    });

    expect(result).toBe('done');
    expect(await countTags()).toBe(2);
  });

  it('rolls everything back when the work throws, and rethrows', async () => {
    await expect(
      unitOfWork.run(async (executor) => {
        await insertTag(executor, 'viagem');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(await countTags()).toBe(0);
  });

  it('rolls back when the database refuses a write halfway', async () => {
    await expect(
      unitOfWork.run(async (executor) => {
        await insertTag(executor, 'viagem');
        await insertTag(executor, 'VIAGEM'); // same tag, another case: UNIQUE NOCASE
      }),
    ).rejects.toThrow(/UNIQUE/);

    expect(await countTags()).toBe(0);
  });

  it('throws the original error even when the rollback itself fails', async () => {
    await expect(
      unitOfWork.run(async (executor) => {
        await sql`rollback`.execute(executor); // the transaction is gone: the next rollback fails
        throw new Error('original');
      }),
    ).rejects.toThrow('original');
  });

  it('is usable again after a failed run', async () => {
    await unitOfWork.run(() => Promise.reject(new Error('boom'))).catch(() => undefined);

    await unitOfWork.run((executor) => insertTag(executor, 'viagem'));

    expect(await countTags()).toBe(1);
  });

  it('takes the write lock at the start (BEGIN IMMEDIATE), before any write', async () => {
    const other = new BetterSqlite3(database.file);
    other.pragma('busy_timeout = 0');

    try {
      await unitOfWork.run(async (executor) => {
        await executor.selectFrom('tags').select('id').execute(); // only a read

        // Another connection cannot start a writer now: with a deferred BEGIN it could.
        expect(() => other.exec('BEGIN IMMEDIATE')).toThrow(/locked|busy/i);
      });

      other.exec('BEGIN IMMEDIATE'); // after the commit the lock is free
      other.exec('ROLLBACK');
    } finally {
      other.close();
    }
  });
});
