import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { createApp } from '#/main/http/create-app.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';

export const TEST_LOCAL_TOKEN = 'test-local-token-0123456789abcdef';

// The API with a known local token. `request` already sends the token header; pass the header in
// `init` to send another value.
export function createTestApp(db: Kysely<Database>) {
  const app = createApp({ db, localToken: TEST_LOCAL_TOKEN });

  return {
    request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers);
      if (!headers.has(LOCAL_TOKEN_HEADER)) headers.set(LOCAL_TOKEN_HEADER, TEST_LOCAL_TOKEN);

      return app.request(path, { ...init, headers });
    },
  };
}
