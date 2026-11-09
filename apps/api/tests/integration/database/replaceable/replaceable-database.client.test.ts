import { copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { sql, type Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('ReplaceableDatabase', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let other: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    other = join(mkdtempSync(join(tmpdir(), 'fincheck-replace-')), 'other.db');
  });

  afterEach(async () => {
    await database.destroy();
    rmSync(join(other, '..'), { recursive: true, force: true });
  });

  const insertTag = (db: Kysely<Database>, name: string) =>
    db
      .insertInto('tags')
      .values({
        id: generateId(),
        name,
        archived_at: null,
        created_at: '2026-11-08T12:00:00.000Z',
        updated_at: '2026-11-08T12:00:00.000Z',
      })
      .execute();
  const names = async (db: ReplaceableDatabase) =>
    (await db.selectFrom('tags').select('name').orderBy('name').execute()).map((row) => row.name);

  it('is the same object after a swap and reads the new file', async () => {
    await insertTag(database.db, 'live');
    const reference = database.db;
    // The new file is a copy of the schema with another row.
    await sql`vacuum into ${other}`.execute(database.db);
    const copy = createSqliteClient(other);
    await copy.deleteFrom('tags').execute();
    await insertTag(copy, 'swapped');
    await copy.destroy();

    await database.db.replaceFile(async () => {
      renameSync(other, database.file);
      return undefined;
    });

    expect(database.db).toBe(reference);
    expect(await names(database.db)).toEqual(['swapped']);
  });

  it('closes the connection while the swap runs and removes the log of the old file', async () => {
    await insertTag(database.db, 'live');
    expect(existsSync(`${database.file}-wal`)).toBe(true);

    await database.db.replaceFile(async () => {
      // The WAL was folded into the file and removed: a new file never meets the log of the old one.
      expect(existsSync(`${database.file}-wal`)).toBe(false);
      expect(existsSync(`${database.file}-shm`)).toBe(false);
      // The old file, folded, has the row.
      copyFileSync(database.file, other);

      return undefined;
    });

    expect(await names(database.db)).toEqual(['live']);
  });

  it('waits for a transaction in flight, and the queries that come meanwhile wait for the swap', async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    const transaction = database.db.connection().execute(async (connection) => {
      await sql`begin immediate`.execute(connection);
      await insertTag(connection, 'in-flight');
      order.push('transaction started');
      await held;
      await sql`commit`.execute(connection);
      order.push('transaction committed');
    });
    // Let the transaction take the connection.
    await new Promise((resolve) => setTimeout(resolve, 20));

    const swap = database.db.replaceFile(async () => {
      order.push('swapped');
      return undefined;
    });
    const read = names(database.db).then(() => order.push('read after the swap'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(order).toEqual(['transaction started']);

    release();
    await Promise.all([transaction, swap, read]);

    expect(order).toEqual([
      'transaction started',
      'transaction committed',
      'swapped',
      'read after the swap',
    ]);
  });

  it('opens the handle again and rethrows when the swap throws', async () => {
    await insertTag(database.db, 'live');

    await expect(
      database.db.replaceFile(async () => {
        throw new Error('could not swap');
      }),
    ).rejects.toThrow('could not swap');

    expect(await names(database.db)).toEqual(['live']);
  });

  it('puts the old file back (undo) when the new one cannot be opened', async () => {
    await insertTag(database.db, 'live');
    const old = `${database.file}.old`;

    await expect(
      database.db.replaceFile(async () => {
        renameSync(database.file, old);
        // A folder where the file should be: SQLite cannot open it.
        mkdirSync(database.file);

        return async () => {
          rmSync(database.file, { recursive: true, force: true });
          renameSync(old, database.file);
        };
      }),
    ).rejects.toThrow();

    expect(await names(database.db)).toEqual(['live']);
  });

  it('does not create an empty database when neither file can be put in place; it stays closed', async () => {
    await insertTag(database.db, 'live');
    const old = `${database.file}.old`;

    await expect(
      database.db.replaceFile(async () => {
        renameSync(database.file, old);

        return Promise.reject(new Error('both moves failed'));
      }),
    ).rejects.toThrow('both moves failed');

    expect(database.db.isOpen).toBe(false);
    expect(existsSync(database.file)).toBe(false);
    await expect(names(database.db)).rejects.toThrow('The database is closed');
  });

  it('refuses writes while frozen, reads still work, and a swap opens a writable handle', async () => {
    await insertTag(database.db, 'live');

    await database.db.setWritesFrozen(true);
    await expect(insertTag(database.db, 'late')).rejects.toThrow(/readonly/i);
    expect(await names(database.db)).toEqual(['live']);

    await database.db.setWritesFrozen(false);
    await insertTag(database.db, 'again');
    expect(await names(database.db)).toEqual(['again', 'live']);
  });

  it('keeps the file it was given', async () => {
    expect(database.db.file).toBe(database.file);
  });
});
