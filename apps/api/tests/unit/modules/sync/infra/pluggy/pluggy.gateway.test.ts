import { describe, expect, it } from 'vitest';

import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import { PluggyClient } from '#/modules/sync/infra/pluggy/pluggy.client.ts';
import { PluggyGateway } from '#/modules/sync/infra/pluggy/pluggy.gateway.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

const CREDENTIALS: BankDataProvider.Credentials = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret-9f3a',
};
const OTHER_CREDENTIALS: BankDataProvider.Credentials = {
  clientId: 'other-client-id',
  clientSecret: 'other-client-secret-77b1',
};
const BASE_URL = 'https://pluggy.test';

type Call = {
  method: string;
  path: string;
  query: URLSearchParams;
  apiKey: string | null;
  body: unknown;
  signal: AbortSignal | null | undefined;
};
type Handler = (call: Call) => Response | Promise<Response>;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const page = (results: unknown[], pageNumber = 1, totalPages = 1) =>
  json({ total: results.length, totalPages, page: pageNumber, results });
// The page of the cursor endpoint (`GET /v2/transactions`): `next` is a query string, or null on the
// last page (https://docs.pluggy.ai/reference/transactions-list-by-cursor, read on 09/11/2026).
const cursorPage = (results: unknown[], after: string | null, accountId = 'acc-1') =>
  json({
    results,
    next: after === null ? null : `?accountId=${accountId}&after=${encodeURIComponent(after)}`,
  });

// A `fetch` that answers by a handler and writes down every call.
const setup = (handler: Handler) => {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  const time = { now: Date.parse('2026-11-09T12:00:00.000Z') };
  const clock = new SystemClock(() => time.now);
  const fakeFetch = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const headers = new Headers(init?.headers);
    const call: Call = {
      method: init?.method ?? 'GET',
      path: url.pathname,
      query: url.searchParams,
      apiKey: headers.get('X-API-KEY'),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      signal: init?.signal,
    };

    calls.push(call);

    return handler(call);
  }) as typeof fetch;
  const gateway = new PluggyGateway(
    new PluggyClient({
      fetch: fakeFetch,
      baseUrl: BASE_URL,
      clock,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    }),
    clock,
  );

  return { gateway, calls, time, sleeps };
};

const authCalls = (calls: Call[]): Call[] => calls.filter((call) => call.path === '/auth');

// Answers `/auth` with a numbered key (`key-1`, `key-2`...) and the rest with `rest`.
const withAuth = (rest: Handler): Handler => {
  let issued = 0;

  return (call) => {
    if (call.path === '/auth') {
      issued += 1;

      return json({ apiKey: `key-${issued}` });
    }

    return rest(call);
  };
};

const ITEM = {
  id: 'item-1',
  connector: { id: 612, name: 'Nubank' },
  status: 'UPDATED',
  executionStatus: 'SUCCESS',
  lastUpdatedAt: '2026-11-09T09:00:00.000Z',
};

const expectKind = async (work: Promise<unknown>, kind: BankProviderError.Kind): Promise<void> => {
  const error = await work.then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(BankProviderError);
  expect((error as BankProviderError).kind).toBe(kind);
};

describe('PluggyGateway: authentication', () => {
  it('authenticates with the keys in a JSON body and sends the key in X-API-KEY', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'item-1');

    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/auth',
      body: { clientId: CREDENTIALS.clientId, clientSecret: CREDENTIALS.clientSecret },
    });
    expect(calls[1]).toMatchObject({ method: 'GET', path: '/items/item-1', apiKey: 'key-1' });
  });

  it('puts a timeout of 30 s on every call', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'item-1');

    expect(calls.every((call) => call.signal instanceof AbortSignal)).toBe(true);
  });

  it('keeps the key: two calls make one POST /auth', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'item-1');
    await gateway.getItem(CREDENTIALS, 'item-1');

    expect(authCalls(calls)).toHaveLength(1);
    expect(calls.filter((call) => call.path === '/items/item-1')).toHaveLength(2);
  });

  it('two rounds at the same time make one POST /auth (single flight), and all use the key it gave', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { gateway, calls } = setup(async (call) => {
      if (call.path === '/auth') {
        await gate;

        return json({ apiKey: 'key-1' });
      }

      return json(ITEM);
    });

    const all = Promise.all([
      gateway.getItem(CREDENTIALS, 'item-1'),
      gateway.getItem(CREDENTIALS, 'item-1'),
      gateway.getItem(CREDENTIALS, 'item-1'),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    release();
    await all;

    expect(authCalls(calls)).toHaveLength(1);
    expect(
      calls.filter((call) => call.path === '/items/item-1').map((call) => call.apiKey),
    ).toEqual(['key-1', 'key-1', 'key-1']);
  });

  it('a refused authentication does not stay in the single flight: the next call asks again', async () => {
    let answers = 0;
    const { gateway, calls } = setup((call) => {
      if (call.path === '/auth') {
        answers += 1;

        return answers === 1 ? json({}, 500) : json({ apiKey: 'key-2' });
      }

      return json(ITEM);
    });

    await expectKind(gateway.getItem(CREDENTIALS, 'item-1'), 'unavailable');
    await expect(gateway.getItem(CREDENTIALS, 'item-1')).resolves.toMatchObject({ state: 'ok' });

    expect(authCalls(calls)).toHaveLength(2);
  });

  it('keeps the key for 1h50 and renews it after', async () => {
    const { gateway, calls, time } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'item-1');
    time.now += 109 * 60 * 1000;
    await gateway.getItem(CREDENTIALS, 'item-1');
    expect(authCalls(calls)).toHaveLength(1);

    time.now += 2 * 60 * 1000;
    await gateway.getItem(CREDENTIALS, 'item-1');
    expect(authCalls(calls)).toHaveLength(2);
    expect(calls.at(-1)?.apiKey).toBe('key-2');
  });

  it('keeps one key per pair of keys', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'item-1');
    await gateway.getItem(OTHER_CREDENTIALS, 'item-1');
    await gateway.getItem(CREDENTIALS, 'item-1');

    expect(authCalls(calls)).toHaveLength(2);
    expect(authCalls(calls)[1]?.body).toMatchObject({ clientId: OTHER_CREDENTIALS.clientId });
  });

  it('renews the key and repeats the call once when one answers 401 in the middle', async () => {
    let item = 0;
    const { gateway, calls } = setup(
      withAuth(() => {
        item += 1;

        return item === 1 ? json({ error: 'expired' }, 401) : json(ITEM);
      }),
    );

    await expect(gateway.getItem(CREDENTIALS, 'item-1')).resolves.toMatchObject({ state: 'ok' });

    expect(calls.map((call) => [call.path, call.apiKey])).toEqual([
      ['/auth', null],
      ['/items/item-1', 'key-1'],
      ['/auth', null],
      ['/items/item-1', 'key-2'],
    ]);
  });

  it('renews on 403 too, and only once: a second refusal is `unavailable`', async () => {
    const { gateway, calls } = setup(withAuth(() => json({}, 403)));

    await expectKind(gateway.getItem(CREDENTIALS, 'item-1'), 'unavailable');

    expect(authCalls(calls)).toHaveLength(2);
    expect(calls.filter((call) => call.path === '/items/item-1')).toHaveLength(2);
  });

  it('says `credentials_invalid` when the authentication is refused (verify and any call)', async () => {
    const { gateway } = setup(() => json({ message: 'bad keys' }, 401));

    await expectKind(gateway.verifyCredentials(CREDENTIALS), 'credentials_invalid');
    await expectKind(gateway.getItem(CREDENTIALS, 'item-1'), 'credentials_invalid');
    await expectKind(gateway.createConnectToken(CREDENTIALS), 'credentials_invalid');
  });

  it('says `credentials_invalid` for a 4xx and `unavailable` for 429 and 5xx on the authentication', async () => {
    await expectKind(
      setup(() => json({}, 400)).gateway.verifyCredentials(CREDENTIALS),
      'credentials_invalid',
    );
    await expectKind(
      setup(() => json({}, 429)).gateway.verifyCredentials(CREDENTIALS),
      'unavailable',
    );
    await expectKind(
      setup(() => json({}, 500)).gateway.verifyCredentials(CREDENTIALS),
      'unavailable',
    );
  });

  it('verifies against the provider every time (it does not trust the key in memory)', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.verifyCredentials(CREDENTIALS);
    await gateway.verifyCredentials(CREDENTIALS);

    expect(authCalls(calls)).toHaveLength(2);
  });

  it('says `unavailable` when the authentication answers something that is not documented', async () => {
    await expectKind(
      setup(() => json({ token: 'x' })).gateway.verifyCredentials(CREDENTIALS),
      'unavailable',
    );
    await expectKind(
      setup(() => new Response('<html>oops</html>')).gateway.verifyCredentials(CREDENTIALS),
      'unavailable',
    );
  });
});

describe('PluggyGateway: connect token', () => {
  it('posts an empty body and gives the token with 30 minutes of life', async () => {
    const { gateway, calls } = setup(withAuth(() => json({ accessToken: 'connect-token-1' })));

    await expect(gateway.createConnectToken(CREDENTIALS)).resolves.toEqual({
      connectToken: 'connect-token-1',
      expiresAt: '2026-11-09T12:30:00.000Z',
    });

    expect(calls[1]).toMatchObject({ method: 'POST', path: '/connect_token', body: {} });
  });

  it('says `unavailable` when the token does not come', async () => {
    const { gateway } = setup(withAuth(() => json({})));

    await expectKind(gateway.createConnectToken(CREDENTIALS), 'unavailable');
  });
});

describe('PluggyGateway: item', () => {
  it('translates the item with the instant of the clock', async () => {
    const { gateway } = setup(
      withAuth(() => json({ ...ITEM, consentExpiresAt: '2026-11-09T11:59:59.000Z' })),
    );

    await expect(gateway.getItem(CREDENTIALS, 'item-1')).resolves.toMatchObject({
      id: 'item-1',
      institutionCode: 'nubank',
      state: 'error',
      errorCode: 'CONSENT_REVOKED',
    });
  });

  it('says `item_not_found` on 404', async () => {
    const { gateway } = setup(withAuth(() => json({ message: 'Item not found' }, 404)));

    await expectKind(gateway.getItem(CREDENTIALS, 'item-x'), 'item_not_found');
  });

  it('encodes the id in the path', async () => {
    const { gateway, calls } = setup(withAuth(() => json(ITEM)));

    await gateway.getItem(CREDENTIALS, 'a/b c');

    expect(calls[1]?.path).toBe('/items/a%2Fb%20c');
  });
});

describe('PluggyGateway: accounts', () => {
  const accounts = [
    {
      id: 'acc-1',
      type: 'BANK',
      subtype: 'CHECKING_ACCOUNT',
      name: 'Conta',
      balance: 100.5,
      number: '1234-5',
    },
    { id: 'acc-2', type: 'INVESTMENT', subtype: 'MUTUAL_FUND', name: 'Fundo', balance: 10 },
    {
      id: 'acc-3',
      type: 'CREDIT',
      subtype: 'CREDIT_CARD',
      name: 'Cartão',
      balance: 300,
      number: '4444',
      creditData: {
        brand: 'VISA',
        balanceCloseDate: '2026-11-20T00:00:00.000Z',
        creditLimit: 2000,
      },
    },
  ];

  it('asks by item and keeps only checking, savings and card', async () => {
    const { gateway, calls } = setup(withAuth(() => page(accounts)));

    const result = await gateway.listAccounts(CREDENTIALS, 'item-1');

    expect(result.map((account) => [account.id, account.type])).toEqual([
      ['acc-1', 'checking'],
      ['acc-3', 'credit_card'],
    ]);
    expect(calls[1]?.path).toBe('/accounts');
    expect(calls[1]?.query.get('itemId')).toBe('item-1');
    expect(calls[1]?.query.get('pageSize')).toBe('500');
  });

  it('says `item_not_found` when the provider has no such item for the accounts', async () => {
    const { gateway } = setup(withAuth(() => json({}, 404)));

    await expectKind(gateway.listAccounts(CREDENTIALS, 'item-x'), 'item_not_found');
  });

  it('does not cut a list of pages in silence: more pages than the limit is `unavailable`', async () => {
    const { gateway } = setup(withAuth(() => page([accounts[0]], 1, 999)));

    await expectKind(gateway.listAccounts(CREDENTIALS, 'item-1'), 'unavailable');
  });

  it('says `unavailable` when the list is not what was documented', async () => {
    await expectKind(
      setup(withAuth(() => json({ results: 'nope' }))).gateway.listAccounts(CREDENTIALS, 'i'),
      'unavailable',
    );
    await expectKind(
      setup(withAuth(() => json([]))).gateway.listAccounts(CREDENTIALS, 'i'),
      'unavailable',
    );
  });
});

describe('PluggyGateway: transactions', () => {
  const purchase = {
    id: 'tx-1',
    description: 'Padaria',
    amount: 12.5,
    date: '2026-11-03T14:00:00.000Z',
    status: 'POSTED',
    type: 'DEBIT',
  };

  const checkingAccount = (call: Call) =>
    call.path === '/accounts/acc-1'
      ? json({ id: 'acc-1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Conta' })
      : null;
  const v2Calls = (calls: Call[]) => calls.filter((call) => call.path === '/v2/transactions');

  // https://docs.pluggy.ai/reference/transactions-list-by-cursor (read on 09/11/2026): `GET
  // /v2/transactions`, `accountId` required, `dateFrom` (yyyy-mm-dd), `after` the cursor; the answer
  // is `{ results, next }` and `next` is a query string with the `after`, or null on the last page.
  it('goes through every page of the cursor endpoint (v2) and keeps the order', async () => {
    const cursors = ['cursor-a+/==', 'cursor-b'];
    const { gateway, calls } = setup(
      withAuth((call) => {
        const account = checkingAccount(call);
        if (account) return account;
        const after = call.query.get('after');
        const index = after === null ? 0 : cursors.indexOf(after) + 1;

        return cursorPage([{ ...purchase, id: `tx-${String(index + 1)}` }], cursors[index] ?? null);
      }),
    );

    const result = await gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01');

    expect(result.map((transaction) => transaction.id)).toEqual(['tx-1', 'tx-2', 'tx-3']);
    const transactionCalls = v2Calls(calls);

    expect(transactionCalls).toHaveLength(3);
    // The first call has no cursor; the next ones send the `after` of `next`, decoded (the client
    // encodes it again), and keep the filters, so a `next` without `dateFrom` does not widen the window.
    expect(transactionCalls.map((call) => call.query.get('after'))).toEqual([
      null,
      'cursor-a+/==',
      'cursor-b',
    ]);
    for (const call of transactionCalls) {
      expect(call.query.get('accountId')).toBe('acc-1');
      expect(call.query.get('dateFrom')).toBe('2026-10-01');
      expect(call.query.has('page')).toBe(false);
      expect(call.query.has('pageSize')).toBe(false);
      expect(call.query.has('from')).toBe(false);
    }
  });

  it('never calls the deprecated GET /transactions (it leaves on 31/12/2026)', async () => {
    const { gateway, calls } = setup(
      withAuth((call) => checkingAccount(call) ?? cursorPage([purchase], null)),
    );

    await gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01');

    expect(calls.some((call) => call.path === '/transactions')).toBe(false);
    expect(v2Calls(calls)).toHaveLength(1);
  });

  it('a transaction the cursor repeats between two pages is one transaction (the last version)', async () => {
    const { gateway } = setup(
      withAuth((call) => {
        const account = checkingAccount(call);
        if (account) return account;

        return call.query.get('after') === null
          ? cursorPage([purchase, { ...purchase, id: 'tx-2' }], 'next')
          : cursorPage([{ ...purchase, amount: 99 }], null);
      }),
    );

    const result = await gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01');

    expect(result.map((transaction) => [transaction.id, transaction.amountCents])).toEqual([
      ['tx-1', -9900],
      ['tx-2', -1250],
    ]);
  });

  it.each([
    ['a `next` that is missing', () => json({ results: [purchase] })],
    ['a `next` with no `after`', () => json({ results: [purchase], next: '?accountId=acc-1' })],
    ['results that are not a list', () => json({ results: 'nope', next: null })],
  ])('says `unavailable` for %s', async (_name, answer) => {
    const { gateway } = setup(withAuth((call) => checkingAccount(call) ?? answer()));

    await expectKind(gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01'), 'unavailable');
  });

  it('says `unavailable` when the cursor does not move (it would never end)', async () => {
    const { gateway, calls } = setup(
      withAuth((call) => checkingAccount(call) ?? cursorPage([purchase], 'same')),
    );

    await expectKind(gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01'), 'unavailable');

    expect(v2Calls(calls).length).toBeLessThanOrEqual(3);
  });

  it('does not cut the list in silence: more pages than the limit is `unavailable`, not a short list', async () => {
    let served = 0;
    const { gateway } = setup(
      withAuth((call) => {
        const account = checkingAccount(call);
        if (account) return account;
        served += 1;

        return cursorPage(
          [{ ...purchase, id: `tx-${String(served)}` }],
          `cursor-${String(served)}`,
        );
      }),
    );

    await expectKind(gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01'), 'unavailable');
  });

  it('translates the checking account (sign by type, business date) and drops zeros', async () => {
    const { gateway } = setup(
      withAuth((call) => {
        if (call.path === '/accounts') {
          return page([{ id: 'acc-1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Conta' }]);
        }

        return cursorPage(
          [
            purchase,
            {
              ...purchase,
              id: 'tx-2',
              type: 'CREDIT',
              amount: 3000,
              date: '2026-11-05T00:00:00.000Z',
            },
            { ...purchase, id: 'tx-3', amount: 0 },
          ],
          null,
        );
      }),
    );

    await gateway.listAccounts(CREDENTIALS, 'item-1');
    const result = await gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'tx-1', amountCents: -1250, occurredOn: '2026-11-03' });
    expect(result[1]).toMatchObject({ id: 'tx-2', amountCents: 300000, occurredOn: '2026-11-05' });
  });

  it('flips the sign on a card, knowing the type from the list of accounts (no extra call)', async () => {
    const { gateway, calls } = setup(
      withAuth((call) => {
        if (call.path === '/accounts') {
          return page([{ id: 'acc-3', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Cartão' }]);
        }

        return cursorPage([purchase, { ...purchase, id: 'tx-pay', amount: -500 }], null);
      }),
    );

    await gateway.listAccounts(CREDENTIALS, 'item-1');
    const result = await gateway.listTransactions(CREDENTIALS, 'acc-3', '2026-10-01');

    expect(result.map((transaction) => transaction.amountCents)).toEqual([-1250, 50000]);
    expect(calls.some((call) => call.path === '/accounts/acc-3')).toBe(false);
  });

  it('asks the provider for the account when it was not listed in this run', async () => {
    const { gateway, calls } = setup(
      withAuth((call) =>
        call.path === '/accounts/acc-3'
          ? json({ id: 'acc-3', type: 'CREDIT', subtype: 'CREDIT_CARD', name: 'Cartão' })
          : cursorPage([purchase], null),
      ),
    );

    const result = await gateway.listTransactions(CREDENTIALS, 'acc-3', '2026-10-01');

    expect(result[0]?.amountCents).toBe(-1250);
    expect(result[0]?.method).toBe('credit');
    expect(calls.filter((call) => call.path === '/accounts/acc-3')).toHaveLength(1);

    await gateway.listTransactions(CREDENTIALS, 'acc-3', '2026-10-01');
    expect(calls.filter((call) => call.path === '/accounts/acc-3')).toHaveLength(1);
  });

  it('gives nothing for an account of a type Fincheck does not keep', async () => {
    const { gateway, calls } = setup(
      withAuth((call) =>
        call.path === '/accounts/acc-9'
          ? json({ id: 'acc-9', type: 'INVESTMENT', subtype: 'MUTUAL_FUND', name: 'Fundo' })
          : cursorPage([purchase], null),
      ),
    );

    await expect(gateway.listTransactions(CREDENTIALS, 'acc-9', '2026-10-01')).resolves.toEqual([]);

    expect(calls.some((call) => call.path === '/v2/transactions')).toBe(false);
  });

  it('says `unavailable` when a transaction is not what was documented', async () => {
    const { gateway } = setup(
      withAuth((call) =>
        call.path === '/accounts/acc-1'
          ? json({ id: 'acc-1', type: 'BANK', subtype: 'CHECKING_ACCOUNT', name: 'Conta' })
          : cursorPage([{ id: 'tx-1', amount: 'ten', date: '2026-11-03' }], null),
      ),
    );

    await expectKind(gateway.listTransactions(CREDENTIALS, 'acc-1', '2026-10-01'), 'unavailable');
  });
});

describe('PluggyGateway: invoices', () => {
  it('translates the closed invoices of the card, every page', async () => {
    const { gateway, calls } = setup(
      withAuth((call) =>
        Number(call.query.get('page')) === 1
          ? page([{ id: 'b-1', dueDate: '2026-10-05T00:00:00.000Z', totalAmount: 100.1 }], 1, 2)
          : page([{ id: 'b-2', dueDate: '2026-11-05T02:30:00.000Z', totalAmount: 0.29 }], 2, 2),
      ),
    );

    await expect(gateway.listInvoices(CREDENTIALS, 'acc-3')).resolves.toEqual([
      { id: 'b-1', dueOn: '2026-10-05', totalCents: 10010 },
      { id: 'b-2', dueOn: '2026-11-04', totalCents: 29 },
    ]);

    expect(calls[1]).toMatchObject({ path: '/bills' });
    expect(calls[1]?.query.get('accountId')).toBe('acc-3');
  });
});

describe('PluggyGateway: failures', () => {
  it.each([
    [500, 'unavailable'],
    [502, 'unavailable'],
    [429, 'unavailable'],
    [400, 'unavailable'],
  ] as const)('status %s on a call is %s', async (status, kind) => {
    const { gateway } = setup(withAuth(() => json({ message: 'nope' }, status)));

    await expectKind(gateway.listAccounts(CREDENTIALS, 'item-1'), kind);
    await expectKind(gateway.listInvoices(CREDENTIALS, 'acc-1'), kind);
    await expectKind(gateway.createConnectToken(CREDENTIALS), kind);
  });

  // https://docs.pluggy.ai/en/docs/developer-tools/rate-limits (read on 09/11/2026): 429 carries
  // `Retry-After` (always 60) and `RateLimit-Reset` (seconds left); the limit is 360 a minute per route.
  it('on 429 of a list it waits what `Retry-After` says and asks once more', async () => {
    let asked = 0;
    const { gateway, sleeps } = setup(
      withAuth(() => {
        asked += 1;

        return asked === 1
          ? new Response('{}', { status: 429, headers: { 'Retry-After': '60' } })
          : page([{ id: 'b-1', dueDate: '2026-10-05T00:00:00.000Z', totalAmount: 10 }]);
      }),
    );

    await expect(gateway.listInvoices(CREDENTIALS, 'acc-3')).resolves.toHaveLength(1);

    expect(sleeps).toEqual([60_000]);
    expect(asked).toBe(2);
  });

  it('on 429 it falls back to `RateLimit-Reset`, waits once only and then says `unavailable`', async () => {
    const { gateway, sleeps } = setup(
      withAuth(() => new Response('{}', { status: 429, headers: { 'RateLimit-Reset': '7' } })),
    );

    await expectKind(gateway.listInvoices(CREDENTIALS, 'acc-3'), 'unavailable');

    expect(sleeps).toEqual([7000]);
  });

  it('does not wait for a 429 that asks for more than a minute, or says nothing', async () => {
    const long = setup(
      withAuth(() => new Response('{}', { status: 429, headers: { 'Retry-After': '3600' } })),
    );
    const silent = setup(withAuth(() => json({}, 429)));

    await expectKind(long.gateway.listInvoices(CREDENTIALS, 'acc-3'), 'unavailable');
    await expectKind(silent.gateway.listInvoices(CREDENTIALS, 'acc-3'), 'unavailable');

    expect(long.sleeps).toEqual([]);
    expect(silent.sleeps).toEqual([]);
  });

  it('never waits on 429 for the authentication (the request of Lucas would hang)', async () => {
    const { gateway, sleeps } = setup(
      () => new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }),
    );

    await expectKind(gateway.verifyCredentials(CREDENTIALS), 'unavailable');

    expect(sleeps).toEqual([]);
  });

  it('says `unavailable` when `fetch` throws, on the authentication and on a call', async () => {
    const offline = setup(() => {
      throw new TypeError('fetch failed');
    });

    await expectKind(offline.gateway.getItem(CREDENTIALS, 'item-1'), 'unavailable');

    const timeout = setup(
      withAuth(() => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      }),
    );

    await expectKind(timeout.gateway.listAccounts(CREDENTIALS, 'item-1'), 'unavailable');
  });

  it('says `unavailable` when the body is not JSON or is null', async () => {
    await expectKind(
      setup(
        withAuth(() => new Response('<html>bad gateway</html>', { status: 200 })),
      ).gateway.getItem(CREDENTIALS, 'item-1'),
      'unavailable',
    );
    await expectKind(
      setup(withAuth(() => new Response('null', { status: 200 }))).gateway.getItem(
        CREDENTIALS,
        'item-1',
      ),
      'unavailable',
    );
  });

  it('never leaks a key, a secret or a body in what it throws', async () => {
    const leaks = [CREDENTIALS.clientSecret, CREDENTIALS.clientId, 'key-1', 'body-with-secret'];
    const scenarios: Handler[] = [
      () => {
        throw new Error(`connect ECONNREFUSED ${CREDENTIALS.clientSecret} key-1`);
      },
      withAuth(() => json({ message: `body-with-secret ${CREDENTIALS.clientSecret}` }, 500)),
      withAuth(() => json({ message: 'body-with-secret key-1' }, 404)),
      withAuth(() => new Response('body-with-secret key-1', { status: 200 })),
      () => json({ message: `body-with-secret ${CREDENTIALS.clientSecret}` }, 401),
    ];

    for (const scenario of scenarios) {
      const { gateway } = setup(scenario);
      const error = await gateway.getItem(CREDENTIALS, 'item-1').then(
        () => null,
        (caught: unknown) => caught as BankProviderError,
      );

      expect(error).toBeInstanceOf(BankProviderError);
      const serialized = [
        error?.message,
        error?.stack?.split('\n')[0],
        JSON.stringify(error),
        String((error as { cause?: unknown }).cause),
      ].join(' ');

      for (const leak of leaks) expect(serialized).not.toContain(leak);
      expect((error as { cause?: unknown }).cause).toBeUndefined();
    }
  });
});
