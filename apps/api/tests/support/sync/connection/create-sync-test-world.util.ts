import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { connectionDtoSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';
import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';
import type { Run } from '@fincheck/shared/sync/run/run.type.ts';
import { expect } from 'vitest';

import { createAppParts } from '#/main/http/create-app-parts.util.ts';
import type { SyncPauseGate } from '#/modules/sync/application/run/sync-pause-gate.interface.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { TEST_LOCAL_TOKEN } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createMovableClock } from '#tests/support/shared/clock/create-movable-clock.util.ts';
import {
  buildTestBankAccount,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';
import { FakeBankProvider } from '#tests/support/sync/provider/fake-bank-provider.service.ts';
import { FakeSecretCipher } from '#tests/support/sync/provider/fake-secret-cipher.service.ts';
import { TestBackgroundRunner } from '#tests/support/sync/run/test-background-runner.service.ts';

// 09/11/2026 12:00 in São Paulo.
const SYNC_TEST_NOW = '2026-11-09T15:00:00.000Z';
export const SYNC_TEST_ITEM_ID = '11111111-1111-4111-8111-111111111111';

// The API as `main` builds it (`createAppParts`), over a SQLite file, with a clock the test moves and
// doubles where `sync` talks to the outside: the Pluggy (`provider`), the cipher of the secret, the
// gate of the backup (`gate.paused`) and the runner of the background rounds (`background`, which
// `settled` waits for). The provider already knows one Nubank item with a checking account; a test
// changes what it knows and calls `connect`.
export async function createSyncTestWorld(
  start: string = SYNC_TEST_NOW,
  // `realGate`: the gate of the backup that `createAppParts` makes (`parts.gate`) is the one the sync
  // asks, as in `main`; by default a double the test moves (`gate.paused`) is.
  options: { realGate?: boolean } = {},
) {
  const database = await createTestDatabase();
  const { clock, moveTo } = createMovableClock(start);
  const provider = new FakeBankProvider();
  const cipher = new FakeSecretCipher();
  const background = new TestBackgroundRunner();
  const gate = { paused: false };
  const pauseGate: SyncPauseGate = { isPaused: () => gate.paused };
  const waits: number[] = [];

  provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
  provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount()]);

  const parts = createAppParts({
    db: database.db,
    localToken: TEST_LOCAL_TOKEN,
    clock,
    sync: {
      provider,
      cipher,
      background,
      ...(options.realGate ? {} : { pauseGate }),
      wait: {
        attempts: 3,
        delayMs: 0,
        sleep: async (ms) => {
          waits.push(ms);
        },
      },
    },
  });

  const send = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    parts.app.request(path, {
      method,
      headers: {
        [LOCAL_TOKEN_HEADER]: TEST_LOCAL_TOKEN,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  const saveKeys = async () => {
    const response = await send('PUT', '/sync/settings', provider.validCredentials);
    expect(response.status).toBe(200);
  };

  const runsOf = async (connectionId: string): Promise<Run.Dto[]> => {
    const response = await send('GET', `/sync/connections/${connectionId}/runs`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[] };

    return body.items.map((item) => runDtoSchema.parse(item));
  };

  const connectionsOf = async (): Promise<Connection.Dto[]> => {
    const response = await send('GET', '/sync/connections');
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[] };

    return body.items.map((item) => connectionDtoSchema.parse(item));
  };

  return {
    database,
    provider,
    cipher,
    background,
    gate,
    waits,
    parts,
    clock,
    moveTo,
    send,
    saveKeys,
    connectionsOf,
    // Registers the item and waits for the first round that goes on in the background.
    connect: async (itemId: string = SYNC_TEST_ITEM_ID): Promise<Connection.Dto> => {
      const response = await send('POST', '/sync/connections', { pluggyItemId: itemId });
      expect(response.status).toBe(202);
      const accepted = connectionDtoSchema.parse(await response.json());
      await background.settled();

      const found = (await connectionsOf()).find((connection) => connection.id === accepted.id);
      if (!found) throw new Error('The connection registered is not in the list');

      return found;
    },
    // "Tentar agora" and the wait for its round: answers the run as it ended.
    retry: async (connectionId: string): Promise<Run.Dto> => {
      const response = await send('POST', `/sync/connections/${connectionId}/runs`);
      expect(response.status).toBe(202);
      const started = runDtoSchema.parse(await response.json());
      await background.settled();

      const ended = (await runsOf(connectionId)).find((run) => run.id === started.id);
      if (!ended) throw new Error('The run is not in the list');

      return ended;
    },
    runsOf,
    expectError: async (response: Response, status: number, code: string) => {
      expect(response.status).toBe(status);
      expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
    },
    // The account of Fincheck that an account of the Pluggy became.
    accountIdOf: async (pluggyAccountId: string): Promise<string> => {
      const row = await database.db
        .selectFrom('sync_account_links')
        .select('account_id')
        .where('pluggy_account_id', '=', pluggyAccountId)
        .executeTakeFirstOrThrow();
      if (row.account_id === null)
        throw new Error('The account of the Pluggy is waiting for Lucas');

      return row.account_id;
    },
    categoryIdOf: async (kind: 'expense' | 'income'): Promise<string> =>
      (
        await database.db
          .selectFrom('categories')
          .select('id')
          .where('kind', '=', kind)
          .where('archived_at', 'is', null)
          .orderBy('name')
          .executeTakeFirstOrThrow()
      ).id,
    transactionsOf: (accountId: string) =>
      database.db
        .selectFrom('transactions')
        .selectAll()
        .where('account_id', '=', accountId)
        .orderBy('occurred_on', 'asc')
        .orderBy('id', 'asc')
        .execute(),
    accountsTable: () =>
      database.db.selectFrom('accounts').selectAll().orderBy('created_at').execute(),
  };
}
