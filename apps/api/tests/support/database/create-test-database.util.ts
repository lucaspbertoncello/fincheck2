import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';

// A real SQLite file in a temp folder, migrated to the latest version. Call `destroy` after the test.
export async function createTestDatabase(): Promise<{
  db: ReplaceableDatabase;
  file: string;
  destroy: () => Promise<void>;
}> {
  const folder = mkdtempSync(join(tmpdir(), 'fincheck-test-'));
  const file = join(folder, 'test.db');
  const db = createSqliteClient(file);
  await migrateToLatest(db);

  return {
    db,
    file,
    destroy: async () => {
      await db.destroy();
      rmSync(folder, { recursive: true, force: true });
    },
  };
}
