import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LOCAL_TOKEN_FILE_NAME } from '#/shared/local-token/local-token.constant.ts';

// The token the API asks for. In order: the `LOCAL_TOKEN` variable; the `local-token` file in the
// data folder; otherwise a random one is generated and saved there, so it survives a restart.
export function resolveLocalToken({
  envToken,
  dataFolder,
}: {
  envToken: string | undefined;
  dataFolder: string;
}): string {
  if (envToken) return envToken;

  const file = join(dataFolder, LOCAL_TOKEN_FILE_NAME);
  if (existsSync(file)) {
    const saved = readFileSync(file, 'utf8').trim();
    if (saved) return saved;
  }

  const generated = randomBytes(32).toString('hex');
  mkdirSync(dataFolder, { recursive: true });
  writeFileSync(file, `${generated}\n`, { mode: 0o600 });

  return generated;
}
