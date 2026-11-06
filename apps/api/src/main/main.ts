import { dirname } from 'node:path';

import { serve } from '@hono/node-server';

import { createSqliteClient } from '#/database/sqlite.client.ts';
import { migrateToLatest } from '#/database/migrate-to-latest.util.ts';
import { createApp } from '#/main/http/create-app.util.ts';
import { API_HOSTNAME } from '#/shared/config/api-hostname.constant.ts';
import { env } from '#/shared/config/env.config.ts';
import { resolveLocalToken } from '#/shared/local-token/resolve-local-token.util.ts';

const db = createSqliteClient(env.DATABASE_FILE);
await migrateToLatest(db);

const localToken = resolveLocalToken({
  envToken: env.LOCAL_TOKEN,
  dataFolder: dirname(env.DATABASE_FILE),
});

const app = createApp({ db, localToken });
const server = serve({ fetch: app.fetch, hostname: API_HOSTNAME, port: env.API_PORT }, (info) => {
  console.log(`Fincheck API on http://${info.address}:${info.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close();
    void db.destroy();
  });
}
