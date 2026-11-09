import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import { hashPluggyCredentials } from '#/modules/sync/infra/pluggy/hash-pluggy-credentials.util.ts';
import type { PluggyAuth } from '#/modules/sync/infra/pluggy/pluggy-auth.type.ts';
import type { PluggyCursorPage } from '#/modules/sync/infra/pluggy/pluggy-cursor-page.type.ts';
import type { PluggyPage } from '#/modules/sync/infra/pluggy/pluggy-page.type.ts';
import { translatePluggyError } from '#/modules/sync/infra/pluggy/translate-pluggy-error.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// The key lasts 2 hours; it is kept for 1h50 to have room.
const KEY_LIFETIME_MS = 110 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 500;
// A stop against a provider that never says it is the last page. More pages than this is a failure,
// never a list cut short in silence (a transaction that is missing looks like one the bank removed).
const MAX_PAGES = 200;
// A 429 on a list is waited for once, and only when the provider says for how long and it is no more
// than this (it always says 60 s: https://docs.pluggy.ai/en/docs/developer-tools/rate-limits).
const MAX_RATE_LIMIT_WAIT_MS = 60_000;

// The HTTP of the Pluggy REST API: the authentication (the key lives in memory, one per pair of
// keys, and two rounds at the same time share one authentication), the retry once when the key is
// refused, the wait once on a 429 of a list, the pages. It throws only `BankProviderError`, never
// with a body, a key or a secret, and logs nothing.
export class PluggyClient {
  private readonly fetchImplementation: typeof fetch;
  private readonly baseUrl: string;
  private readonly clock: Clock;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly apiKeys = new Map<string, { apiKey: string; expiresAt: number }>();
  private readonly authenticating = new Map<string, Promise<string>>();

  constructor(options: PluggyClient.Options = {}) {
    this.fetchImplementation = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl ?? 'https://api.pluggy.ai';
    this.clock = options.clock ?? new SystemClock();
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  // Always asks the provider (it does not trust the key in memory).
  async verifyCredentials(credentials: BankDataProvider.Credentials): Promise<void> {
    await this.authenticate(credentials);
  }

  async get<Body>(
    credentials: BankDataProvider.Credentials,
    path: string,
    query: Record<string, string | number> = {},
    context: PluggyClient.Context = 'other',
  ): Promise<Body> {
    const search = this.searchOf(query);

    return this.send<Body>(
      credentials,
      'GET',
      search ? `${path}?${search}` : path,
      undefined,
      context,
      false,
    );
  }

  async post<Body>(
    credentials: BankDataProvider.Credentials,
    path: string,
    body: unknown,
  ): Promise<Body> {
    return this.send<Body>(credentials, 'POST', path, body, 'other', false);
  }

  // Every page of a list, in order.
  async getAllPages<Result>(
    credentials: BankDataProvider.Credentials,
    path: string,
    query: Record<string, string | number>,
    context: PluggyClient.Context = 'other',
  ): Promise<Result[]> {
    const results: Result[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= MAX_PAGES) {
      const body = await this.getList<PluggyPage.Response<Result>>(
        credentials,
        path,
        { ...query, pageSize: PAGE_SIZE, page },
        context,
      );

      if (!Array.isArray(body.results) || typeof body.totalPages !== 'number') {
        throw new BankProviderError('unavailable');
      }
      results.push(...body.results);
      totalPages = body.totalPages;
      page += 1;
    }
    if (page <= totalPages) throw new BankProviderError('unavailable');

    return results;
  }

  // Every page of a list by cursor (`GET /v2/transactions`), in order. `next` is a query string
  // (`?accountId=...&after=...`) or null on the last page; the next call sends the `after` of it,
  // decoded, with the filters again (the documentation says to send only the decoded `after` when
  // the call is built by hand). A `next` with no `after`, a cursor that does not move and more pages
  // than the limit are failures: the list would be wrong, or would never end.
  async getAllCursorPages<Result>(
    credentials: BankDataProvider.Credentials,
    path: string,
    query: Record<string, string | number>,
    context: PluggyClient.Context = 'other',
  ): Promise<Result[]> {
    const results: Result[] = [];
    const seen = new Set<string>();
    let after: string | null = null;

    for (let pages = 0; pages < MAX_PAGES; pages++) {
      const body: PluggyCursorPage.Response<Result> = await this.getList(
        credentials,
        path,
        after === null ? query : { ...query, after },
        context,
      );

      if (!Array.isArray(body.results)) throw new BankProviderError('unavailable');
      results.push(...body.results);
      if (body.next === null) return results;
      if (typeof body.next !== 'string') throw new BankProviderError('unavailable');
      const cursor = new URLSearchParams(body.next).get('after');

      if (cursor === null || cursor === '' || seen.has(cursor)) {
        throw new BankProviderError('unavailable');
      }
      seen.add(cursor);
      after = cursor;
    }

    throw new BankProviderError('unavailable');
  }

  // A list is read in the background of a round, so a 429 may be waited for (once): the request of
  // Lucas never sits here.
  private getList<Body>(
    credentials: BankDataProvider.Credentials,
    path: string,
    query: Record<string, string | number>,
    context: PluggyClient.Context,
  ): Promise<Body> {
    return this.send<Body>(
      credentials,
      'GET',
      `${path}?${this.searchOf(query)}`,
      undefined,
      context,
      true,
    );
  }

  private searchOf(query: Record<string, string | number>): string {
    return new URLSearchParams(
      Object.entries(query).map(([name, value]) => [name, String(value)]),
    ).toString();
  }

  private async send<Body>(
    credentials: BankDataProvider.Credentials,
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    context: PluggyClient.Context,
    waitOnRateLimit: boolean,
  ): Promise<Body> {
    let apiKey = await this.apiKeyOf(credentials);
    let response = await this.call(method, path, apiKey, body);

    // The key can be revoked before it ends: a new one, and one more try.
    if (response.status === 401 || response.status === 403) {
      this.apiKeys.delete(hashPluggyCredentials(credentials));
      apiKey = await this.authenticate(credentials);
      response = await this.call(method, path, apiKey, body);
    }
    if (response.status === 429 && waitOnRateLimit) {
      const waitMs = this.rateLimitWaitMs(response);

      if (waitMs !== null) {
        await this.discard(response);
        await this.sleep(waitMs);
        response = await this.call(method, path, apiKey, body);
      }
    }
    if (!response.ok) {
      await this.discard(response);
      throw translatePluggyError(response.status, context);
    }

    return this.readJson<Body>(response);
  }

  private async apiKeyOf(credentials: BankDataProvider.Credentials): Promise<string> {
    const kept = this.apiKeys.get(hashPluggyCredentials(credentials));

    if (kept && kept.expiresAt > Date.parse(this.clock.now())) return kept.apiKey;

    return this.authenticate(credentials);
  }

  // One `POST /auth` at a time per pair of keys: whoever comes while it goes on waits for the same
  // answer (the limit of the route is 360 a minute, and the key it gives is good for all).
  private authenticate(credentials: BankDataProvider.Credentials): Promise<string> {
    const hash = hashPluggyCredentials(credentials);
    const going = this.authenticating.get(hash);

    if (going) return going;
    const started = this.requestApiKey(credentials).finally(() => {
      this.authenticating.delete(hash);
    });

    this.authenticating.set(hash, started);

    return started;
  }

  private async requestApiKey(credentials: BankDataProvider.Credentials): Promise<string> {
    const request: PluggyAuth.Request = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    };
    const response = await this.call('POST', '/auth', null, request);

    if (!response.ok) {
      await this.discard(response);
      throw translatePluggyError(response.status, 'authentication');
    }
    const body = await this.readJson<PluggyAuth.Response>(response);

    if (typeof body.apiKey !== 'string' || body.apiKey === '') {
      throw new BankProviderError('unavailable');
    }
    this.apiKeys.set(hashPluggyCredentials(credentials), {
      apiKey: body.apiKey,
      expiresAt: Date.parse(this.clock.now()) + KEY_LIFETIME_MS,
    });

    return body.apiKey;
  }

  // How long the provider asks to wait after a 429, in ms: `Retry-After`, else `RateLimit-Reset`
  // (both in seconds). Null when it says nothing usable or asks for more than a minute.
  private rateLimitWaitMs(response: Response): number | null {
    for (const name of ['Retry-After', 'RateLimit-Reset']) {
      const seconds = Number(response.headers.get(name));

      if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000 <= MAX_RATE_LIMIT_WAIT_MS ? seconds * 1000 : null;
      }
    }

    return null;
  }

  private async call(
    method: 'GET' | 'POST',
    path: string,
    apiKey: string | null,
    body: unknown,
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (apiKey !== null) headers['X-API-KEY'] = apiKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      // The reason (it can name the URL or the proxy) stays out: only that there was no answer.
      throw translatePluggyError(null, 'other');
    }
  }

  private async readJson<Body>(response: Response): Promise<Body> {
    try {
      const body: unknown = await response.json();

      if (typeof body === 'object' && body !== null) return body as Body;
    } catch {
      // Falls to the error below, the same as a body that is not an object.
    }
    throw new BankProviderError('unavailable');
  }

  // Frees the connection of an answer whose body is not read.
  private async discard(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // Nothing to free.
    }
  }
}

export namespace PluggyClient {
  // Where a failure is read: the same status means another thing on the item.
  export type Context = 'item' | 'other';

  export type Options = {
    fetch?: typeof fetch;
    baseUrl?: string;
    clock?: Clock;
    // How the wait after a 429 is made; a test gives one that does not wait.
    sleep?: (ms: number) => Promise<void>;
  };
}
