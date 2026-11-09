import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  connectionDtoSchema,
  createConnectionRequestSchema,
  resolveAccountMatchesRequestSchema,
} from '@fincheck/shared/sync/connection/connection.schema.ts';
import { connectTokenDtoSchema } from '@fincheck/shared/sync/connect-token/connect-token.schema.ts';
import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';
import {
  saveSyncSettingsRequestSchema,
  syncSettingsDtoSchema,
} from '@fincheck/shared/sync/settings/settings.schema.ts';
import { http } from 'msw';

import { newId } from '#mocks/state/mock-id.store.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { finishRunningRuns } from '#mocks/sync/connection/finish-running-runs.util.ts';
import { presentConnection } from '#mocks/sync/connection/present-connection.util.ts';
import { readItemOutcome } from '#mocks/sync/connection/read-item-outcome.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

const idOf = (params: Record<string, string>) => params['id'] ?? '';

function findConnection(id: string): MockState.ConnectionRecord {
  return (
    db.connections.find((item) => item.id === id) ??
    fail(404, 'SYNC_CONNECTION_NOT_FOUND', 'A conexão não existe')
  );
}

// A backup or a restore is running (the database is being swapped): the routes of `sync` that read
// or write refuse first, before anything else (contract, `BACKUP_IN_PROGRESS`).
function assertNoBackupRunning() {
  if (db.backup.running)
    fail(409, 'BACKUP_IN_PROGRESS', 'Há um backup ou uma restauração em andamento');
}

function assertConfigured() {
  if (!db.syncSettings) fail(422, 'SYNC_NOT_CONFIGURED', 'As chaves do Pluggy não estão gravadas');
}

function startRun(connectionId: string, trigger: 'first_connection' | 'retry') {
  const run = {
    id: newId(),
    trigger,
    status: 'running' as const,
    startedAt: NOW_ISO,
    finishedAt: null,
    errorCode: null,
    createdCount: 0,
    updatedCount: 0,
    removedCount: 0,
  };
  db.runs.push({ connectionId, run });

  return run;
}

export const connectionMock = [
  http.get(
    '/api/sync/settings',
    handleRoute({ response: syncSettingsDtoSchema }, () =>
      db.syncSettings
        ? {
            configured: true,
            clientId: db.syncSettings.clientId,
            updatedAt: db.syncSettings.updatedAt,
          }
        : { configured: false, clientId: null, updatedAt: null },
    ),
  ),

  http.put(
    '/api/sync/settings',
    handleRoute(
      { body: saveSyncSettingsRequestSchema, response: syncSettingsDtoSchema },
      ({ body }) => {
        // The mock has no Pluggy: these secrets play "the Pluggy refused the keys" and "the Pluggy
        // could not be reached".
        if (body.clientSecret === 'invalid')
          fail(422, 'SYNC_CREDENTIALS_INVALID', 'O Pluggy recusou as chaves');
        if (body.clientSecret === 'unavailable')
          fail(422, 'SYNC_PROVIDER_UNAVAILABLE', 'Não foi possível falar com o Pluggy');
        db.syncSettings = { clientId: body.clientId, updatedAt: NOW_ISO };

        return { configured: true, clientId: body.clientId, updatedAt: NOW_ISO };
      },
    ),
  ),

  http.post(
    '/api/sync/connect-token',
    handleRoute({ response: connectTokenDtoSchema }, () => {
      assertConfigured();
      // The saved Client ID plays the Pluggy: the keys that stopped working, or no Pluggy at all.
      if (db.syncSettings?.clientId === 'invalid')
        fail(422, 'SYNC_CREDENTIALS_INVALID', 'O Pluggy recusou as chaves');
      if (db.syncSettings?.clientId === 'unavailable')
        fail(422, 'SYNC_PROVIDER_UNAVAILABLE', 'Não foi possível falar com o Pluggy');

      return {
        connectToken: 'token-de-demonstracao',
        expiresAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
      };
    }),
  ),

  http.get(
    '/api/sync/connections',
    handleRoute({ response: listResponseSchema(connectionDtoSchema) }, () => {
      const items = [...db.connections]
        .sort(
          (a, b) =>
            a.institutionName.localeCompare(b.institutionName, 'pt-BR', { sensitivity: 'base' }) ||
            a.createdAt.localeCompare(b.createdAt),
        )
        .map((connection) => presentConnection(db, connection));
      finishRunningRuns(db);

      return { items };
    }),
  ),

  http.post(
    '/api/sync/connections',
    handleRoute(
      { body: createConnectionRequestSchema, response: connectionDtoSchema, status: 202 },
      ({ body }) => {
        // The order of the API: a backup running (409), no keys (422), the connection that exists
        // (409), what the Pluggy says of the item (422), then a round already running (409).
        assertNoBackupRunning();
        assertConfigured();
        const existing = db.connections.find((item) => item.pluggyItemId === body.pluggyItemId);
        if (existing && existing.status !== 'disconnected') {
          fail(409, 'SYNC_CONNECTION_ALREADY_EXISTS', 'Já existe conexão com esse item', {
            connectionId: existing.id,
            status: existing.status,
          });
        }
        const outcome = readItemOutcome(body.pluggyItemId);
        if (outcome.type === 'refused') fail(422, outcome.code, 'O Pluggy recusou o item');
        if (
          existing &&
          db.runs.some(
            (entry) => entry.connectionId === existing.id && entry.run.status === 'running',
          )
        ) {
          fail(409, 'SYNC_RUN_IN_PROGRESS', 'Já há uma rodada em andamento');
        }

        if (existing) {
          // The same item again: the accounts that became manual go back to the bank, the history
          // starts over and the balance of each account comes from the bank in the round.
          existing.status = 'active';
          existing.errorCode = null;
          existing.lastBankUpdateAt = NOW_ISO;
          existing.history = { ...existing.history, status: 'running' };
          for (const accountId of existing.accountIds) {
            const account = db.accounts.find((item) => item.id === accountId);
            if (account) {
              account.source = 'pluggy';
              account.connectionId = existing.id;
            }
          }
          startRun(existing.id, 'first_connection');

          return presentConnection(db, existing);
        }

        // A new item has no account yet: the first round creates them from what the bank says.
        const connection: MockState.ConnectionRecord = {
          id: newId(),
          pluggyItemId: body.pluggyItemId,
          institutionCode: 'inter',
          institutionName: 'Inter',
          status: 'active',
          errorCode: null,
          lastBankUpdateAt: NOW_ISO,
          lastSuccessAt: null,
          history: { status: 'running', fromOn: null, transactionCount: 0 },
          accountIds: [],
          createdAt: NOW_ISO,
          readsSinceStart: 0,
        };
        db.connections.push(connection);
        startRun(connection.id, 'first_connection');

        return presentConnection(db, connection);
      },
    ),
  ),

  http.put(
    '/api/sync/connections/:id/account-matches',
    handleRoute(
      { body: resolveAccountMatchesRequestSchema, response: connectionDtoSchema, status: 202 },
      ({ params, body }) => {
        assertNoBackupRunning();
        const connection = findConnection(idOf(params));
        if (connection.status === 'disconnected')
          fail(422, 'SYNC_CONNECTION_DISCONNECTED', 'A conexão foi desconectada');
        // The mock never leaves an account of the Pluggy waiting for a choice (the connection always
        // answers `pendingAccountMatches: []`), so any choice is "not pending". With no choice there
        // is nothing to import and no round is opened.
        if (body.matches.length > 0)
          fail(422, 'SYNC_ACCOUNT_MATCH_INVALID', 'Nenhuma conta do Pluggy espera escolha');

        return presentConnection(db, connection);
      },
    ),
  ),

  http.delete(
    '/api/sync/connections/:id',
    handleRoute({}, ({ params }) => {
      const connection = findConnection(idOf(params));
      if (connection.status === 'disconnected') return;
      connection.status = 'disconnected';
      connection.errorCode = null;

      for (const accountId of connection.accountIds) {
        const account = db.accounts.find((item) => item.id === accountId);
        if (!account) continue;
        if (account.type !== 'credit_card' && account.bankBalanceCents !== null) {
          // The last bank balance becomes the opening balance of the manual account: the sum is
          // of every transaction that enters the account, whatever its day.
          const own = db.transactions
            .filter((tx) => tx.accountId === account.id && countsInAccounts(tx))
            .reduce((sum, tx) => sum + tx.amountCents, 0);
          const difference = account.bankBalanceCents - own;
          if (difference !== 0) {
            db.transactions.push(
              makeTransactionRecord({
                accountId: account.id,
                origin: 'manual',
                method: 'other',
                nature: 'balance_adjustment',
                natureSetBy: 'system',
                description: 'Ajuste de saldo: Saldo do banco ao desconectar',
                amountCents: difference,
                occurredOn: TODAY,
              }),
            );
          }
        }
        account.source = 'manual';
        account.bankBalanceCents = null;
        account.balanceAt = null;
        account.connectionId = null;
      }
    }),
  ),

  http.get(
    '/api/sync/connections/:id/runs',
    handleRoute({ response: listResponseSchema(runDtoSchema) }, ({ params }) => {
      const connection = findConnection(idOf(params));
      const items = db.runs
        .filter((entry) => entry.connectionId === connection.id)
        .map((entry) => entry.run)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 20);
      finishRunningRuns(db);

      return { items };
    }),
  ),

  http.post(
    '/api/sync/connections/:id/runs',
    handleRoute({ response: runDtoSchema, status: 202 }, ({ params }) => {
      assertNoBackupRunning();
      const connection = findConnection(idOf(params));
      if (connection.status === 'disconnected')
        fail(422, 'SYNC_CONNECTION_DISCONNECTED', 'A conexão foi desconectada');
      assertConfigured();
      if (
        db.runs.some(
          (entry) => entry.connectionId === connection.id && entry.run.status === 'running',
        )
      ) {
        fail(409, 'SYNC_RUN_IN_PROGRESS', 'Já há uma rodada em andamento');
      }

      return startRun(connection.id, 'retry');
    }),
  ),
];
