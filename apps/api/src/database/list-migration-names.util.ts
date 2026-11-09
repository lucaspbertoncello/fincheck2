import { readdir } from 'node:fs/promises';

import { MIGRATIONS_FOLDER } from '#/database/migrations-folder.constant.ts';

// The names of the migrations this version of the app knows, in order (the name Kysely records in
// `kysely_migration`: the file without `.ts`).
export async function listMigrationNames(): Promise<string[]> {
  return (await readdir(MIGRATIONS_FOLDER))
    .filter((file) => file.endsWith('.ts'))
    .sort()
    .map((file) => file.replace(/\.ts$/, ''));
}
