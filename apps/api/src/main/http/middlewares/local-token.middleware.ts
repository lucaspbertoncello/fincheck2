import { createMiddleware } from 'hono/factory';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { LocalTokenInvalidError } from '#/shared/local-token/local-token-invalid.error.ts';
import { localTokenMatches } from '#/shared/local-token/local-token-matches.util.ts';

// Every route but `GET /health` needs the local token in `X-Fincheck-Token`. It is not a login:
// it only stops another page open in the browser from calling the API on this machine.
export function createLocalTokenMiddleware(localToken: string) {
  return createMiddleware(async (c, next) => {
    const isHealth =
      (c.req.method === 'GET' || c.req.method === 'HEAD') && c.req.path === '/health';
    if (!isHealth && !localTokenMatches(c.req.header(LOCAL_TOKEN_HEADER), localToken)) {
      throw new LocalTokenInvalidError();
    }

    await next();
  });
}
