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
import { NOW, NOW_ISO, TODAY } from '#mocks/support/dates/clock.constant.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { finishRunningRuns } from '#mocks/sync/connection/finish-running-runs.util.ts';
import { presentConnection } from '#mocks/sync/connection/present-connection.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

const idOf = (params: Record<string, string>) => params['id'] ?? '';

function findConnection(id: string): MockState.ConnectionRecord {
  return (
    db.connections.find((item) => item.id === id) ??
    fail(404, 'SYNC_CONNECTION_NOT_FOUND', 'A conexão não existe')
  );
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
        // The mock has no Pluggy: this secret plays "the Pluggy refused the keys".
        if (body.clientSecret === 'invalid')
          fail(422, 'SYNC_CREDENTIALS_INVALID', 'O Pluggy recusou as chaves');
        db.syncSettings = { clientId: body.clientId, updatedAt: NOW_ISO };

        return { configured: true, clientId: body.clientId, updatedAt: NOW_ISO };
      },
    ),
  ),

  http.post(
    '/api/sync/connect-token',
    handleRoute({ response: connectTokenDtoSchema }, () => {
      assertConfigured();

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
        assertConfigured();
        const existing = db.connections.find((item) => item.pluggyItemId === body.pluggyItemId);
        if (existing && existing.status !== 'disconnected') {
          fail(409, 'SYNC_CONNECTION_ALREADY_EXISTS', 'Já existe conexão com esse item', {
            connectionId: existing.id,
            status: existing.status,
          });
        }

        if (existing) {
          // The same item again: the accounts that became manual go back to the bank.
          existing.status = 'active';
          for (const accountId of existing.accountIds) {
            const account = db.accounts.find((item) => item.id === accountId);
            if (account) {
              account.source = 'pluggy';
              account.connectionId = existing.id;
              account.bankBalanceCents =
                account.type === 'credit_card' ? 0 : (account.bankBalanceCents ?? 0);
              account.balanceAt = NOW_ISO;
            }
          }
          startRun(existing.id, 'first_connection');

          return presentConnection(db, existing);
        }

        const connection: MockState.ConnectionRecord = {
          id: newId(),
          pluggyItemId: body.pluggyItemId,
          institutionCode: 'inter',
          institutionName: 'Inter',
          status: 'active',
          errorCode: null,
          lastBankUpdateAt: null,
          lastSuccessAt: null,
          history: { status: 'running', fromOn: null, transactionCount: 0 },
          accountIds: [],
          createdAt: NOW_ISO,
          readsSinceStart: 0,
        };
        // The account appears with no balance until the first run ends: that makes the Livre "parcial".
        const account: MockState.AccountRecord = {
          id: newId(),
          type: 'checking',
          source: 'pluggy',
          name: 'Inter',
          institutionCode: 'inter',
          institutionName: null,
          bankBalanceCents: null,
          balanceAt: null,
          connectionId: connection.id,
          creditCard: null,
          archivedAt: null,
          createdAt: NOW_ISO,
        };
        db.accounts.push(account);
        connection.accountIds.push(account.id);
        db.connections.push(connection);
        startRun(connection.id, 'first_connection');

        // Contract: 202 with no accounts yet.
        return { ...presentConnection(db, connection), accounts: [] };
      },
    ),
  ),

  http.put(
    '/api/sync/connections/:id/account-matches',
    handleRoute(
      { body: resolveAccountMatchesRequestSchema, response: connectionDtoSchema, status: 202 },
      ({ params, body }) => {
        const connection = findConnection(idOf(params));
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
          // The last bank balance becomes the opening balance of the manual account.
          const own = db.transactions
            .filter(
              (tx) => tx.accountId === account.id && countsInAccounts(tx) && tx.occurredOn <= TODAY,
            )
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
                description: 'Ajuste de saldo (desconexão)',
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
      const connection = findConnection(idOf(params));
      if (connection.status === 'disconnected')
        fail(422, 'SYNC_CONNECTION_DISCONNECTED', 'A conexão foi desconectada');
      if (
        db.runs.some(
          (entry) => entry.connectionId === connection.id && entry.run.status === 'running',
        )
      ) {
        fail(409, 'SYNC_RUN_IN_PROGRESS', 'Já há uma rodada em andamento');
      }
      assertConfigured();

      return startRun(connection.id, 'retry');
    }),
  ),
];
