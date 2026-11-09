import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Kysely } from 'kysely';
import { Migrator, type Migration } from 'kysely/migration';

import type { Database } from '#/database/database.type.ts';
import { MIGRATIONS_FOLDER } from '#/database/migrations-folder.constant.ts';

// Kysely's FileMigrationProvider imports plain absolute paths, which Node rejects on Windows;
// this provider imports file URLs instead.
export function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({
    db,
    provider: {
      async getMigrations() {
        const files = (await readdir(MIGRATIONS_FOLDER))
          .filter((file) => file.endsWith('.ts'))
          .sort();
        const migrations: Record<string, Migration> = {};
        for (const file of files) {
          const url = pathToFileURL(join(MIGRATIONS_FOLDER, file)).href;
          migrations[file.replace(/\.ts$/, '')] = (await import(url)) as Migration;
        }
        return migrations;
      },
    },
  });
}
