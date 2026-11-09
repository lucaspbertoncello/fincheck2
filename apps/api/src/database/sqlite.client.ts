import { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';

// The connection of the app: opens the file (WAL, foreign keys, busy timeout) and hands back the
// Kysely every module shares. See `ReplaceableDatabase` for why the file can be swapped under it.
export function createSqliteClient(file: string): ReplaceableDatabase {
  return new ReplaceableDatabase(file);
}
