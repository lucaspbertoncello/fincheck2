import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Kysely } from 'kysely';

import { createSqliteClient } from '#/database/sqlite.client.ts';
import type { Database } from '#/database/database.type.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';

// A real SQLite file in a temp folder, migrated to the latest version. Call `destroy` after the test.
export async function createTestDatabase(): Promise<{
  db: Kysely<Database>;
  destroy: () => Promise<void>;
}> {
  const folder = mkdtempSync(join(tmpdir(), 'fincheck-test-'));
  const db = createSqliteClient(join(folder, 'test.db'));
  await migrateToLatest(db);

  return {
    db,
    destroy: async () => {
      await db.destroy();
      rmSync(folder, { recursive: true, force: true });
    },
  };
}
