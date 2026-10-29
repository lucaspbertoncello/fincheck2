import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('createSqliteClient', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('turns on WAL, foreign keys and the busy timeout', async () => {
    const { rows } = await sql<{
      journal_mode: string;
      foreign_keys: number;
      timeout: number;
    }>`select * from pragma_journal_mode, pragma_foreign_keys, pragma_busy_timeout`.execute(
      database.db,
    );

    expect(rows[0]).toEqual({ journal_mode: 'wal', foreign_keys: 1, timeout: 5000 });
  });
});
