import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { createApp } from '#/main/http/create-app.util.ts';

export function createTestApp(db: Kysely<Database>) {
  return createApp({ db });
}
