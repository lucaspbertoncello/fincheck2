import { dirname } from 'node:path';

import { serve } from '@hono/node-server';

import { recoverInterruptedSwap } from '#/database/recover-interrupted-swap.util.ts';
import { createSqliteClient } from '#/database/sqlite.client.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';
import { buildApi } from '#/main/build-api.util.ts';
import { API_HOSTNAME } from '#/shared/config/api-hostname.constant.ts';
import { env } from '#/shared/config/env.config.ts';
import { resolveLocalToken } from '#/shared/local-token/resolve-local-token.util.ts';

// A restore that died between its two file moves leaves no database: put the old one back first.
recoverInterruptedSwap(env.DATABASE_FILE);
const db = createSqliteClient(env.DATABASE_FILE);
await migrateToLatest(db);

const localToken = resolveLocalToken({
  envToken: env.LOCAL_TOKEN,
  dataFolder: dirname(env.DATABASE_FILE),
});

// The app and its tasks (the occurrences of the recurrences are made ready before the first request).
const api = await buildApi({ db, localToken });
const server = serve(
  { fetch: api.app.fetch, hostname: API_HOSTNAME, port: env.API_PORT },
  (info) => {
    console.log(`Fincheck API on http://${info.address}:${info.port}`);
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    api.stop();
    server.close();
    void db.destroy();
  });
}
