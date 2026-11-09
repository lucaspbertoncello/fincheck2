import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Same names the API uses (`apps/api/src/shared/local-token/`, `shared/config/env.config.ts`).
const LOCAL_TOKEN_FILE_NAME = 'local-token';
const DEFAULT_DATABASE_FILE = 'data/fincheck.db';

/**
 * The local token the API asks for, read the way the API reads it: `LOCAL_TOKEN`, else the
 * `local-token` file next to the database (`DATABASE_FILE`, relative to the API folder). Unlike the
 * API it never creates one: `undefined` until the API has started and written the file.
 */
export function readLocalToken(
  apiFolder: string,
  env: Record<string, string | undefined>,
): string | undefined {
  if (env['LOCAL_TOKEN']) return env['LOCAL_TOKEN'];

  const databaseFile = resolve(apiFolder, env['DATABASE_FILE'] || DEFAULT_DATABASE_FILE);
  const file = join(dirname(databaseFile), LOCAL_TOKEN_FILE_NAME);
  if (!existsSync(file)) return undefined;

  return readFileSync(file, 'utf8').trim() || undefined;
}
