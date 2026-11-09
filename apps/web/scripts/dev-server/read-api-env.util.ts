import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * The environment the API runs with, as far as the dev proxy cares: `apps/api/.env` (the API loads
 * it with `--env-file-if-exists`) under the process environment, which wins, as it does for Node.
 */
export function readApiEnv(
  apiFolder: string,
  processEnv: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  const file = join(apiFolder, '.env');
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};

  return { ...fromFile, ...processEnv };
}
