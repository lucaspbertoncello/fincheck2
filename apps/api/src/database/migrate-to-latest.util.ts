import type { Kysely } from 'kysely';

import { createMigrator } from '#/database/create-migrator.util.ts';
import type { Database } from '#/database/database.type.ts';

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const { error } = await createMigrator(db).migrateToLatest();
  if (error) {
    throw new Error('Database migration failed', { cause: error });
  }
}
