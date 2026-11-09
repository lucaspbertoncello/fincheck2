import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { connectionDtoSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { connectTokenDtoSchema } from '@fincheck/shared/sync/connect-token/connect-token.schema.ts';
import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';
import { syncSettingsDtoSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function connections() {
  return listResponseSchema(connectionDtoSchema).parse(
    (await callApi('GET', '/sync/connections')).json,
  ).items;
}

describe('sync routes', () => {
  it('reads the settings, saves new keys and refuses the ones the Pluggy would refuse', async () => {
    expect(
      syncSettingsDtoSchema.parse((await callApi('GET', '/sync/settings')).json).configured,
    ).toBe(true);
    expect(
      (await callApi('PUT', '/sync/settings', { clientId: 'abc', clientSecret: 'invalid' })).status,
    ).toBe(422);
    const saved = syncSettingsDtoSchema.parse(
      (await callApi('PUT', '/sync/settings', { clientId: 'novo', clientSecret: 'segredo' })).json,
    );
    expect(saved.clientId).toBe('novo');
    expect(
      connectTokenDtoSchema.parse((await callApi('POST', '/sync/connect-token')).json).connectToken,
    ).not.toBe('');
  });

  it('lists the connections with the stale Bradesco and the accounts of each bank', async () => {
    const items = await connections();
    expect(items.map((item) => item.institutionName)).toEqual(['Bradesco', 'Nubank']);
    expect(items[0]?.isStale).toBe(true);
    expect(items[1]?.isStale).toBe(false);
    expect(items[1]?.accounts.map((account) => account.type).sort()).toEqual([
      'checking',
      'credit_card',
    ]);
    expect(items[0]?.lastRun?.status).toBe('success');

    const runs = listResponseSchema(runDtoSchema).parse(
      (await callApi('GET', `/sync/connections/${items[0]?.id}/runs`)).json,
    ).items;
    expect(runs).toHaveLength(4);
    expect((runs[0]?.startedAt ?? '') >= (runs[1]?.startedAt ?? '')).toBe(true);
    expect(
      (await callApi('GET', '/sync/connections/0194f3a0-0000-7000-8000-999999999999/runs')).status,
    ).toBe(404);
  });

  it('retries now, refusing a second run while one is going', async () => {
    const [bradesco] = await connections();
    const started = await callApi('POST', `/sync/connections/${bradesco?.id}/runs`);
    expect(started.status).toBe(202);
    expect(runDtoSchema.parse(started.json).status).toBe('running');
    expect((await callApi('POST', `/sync/connections/${bradesco?.id}/runs`)).status).toBe(409);
    await connections();
    const [after] = await connections();
    expect(after?.lastRun?.status).toBe('success');
    expect(after?.isStale).toBe(false);
  });

  it('connects a new bank: no account until the first run ends, then the history it brought', async () => {
    const created = await callApi('POST', '/sync/connections', {
      pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(created.status).toBe(202);
    const connection = connectionDtoSchema.parse(created.json);
    expect(connection.history).toMatchObject({ status: 'running', fromOn: null });
    expect(connection.accounts).toEqual([]);
    expect(connection.lastBankUpdateAt).not.toBeNull();
    expect(connection.lastRun).toMatchObject({ trigger: 'first_connection', status: 'running' });
    expect(db.accounts.some((account) => account.connectionId === connection.id)).toBe(false);
    expect(
      (
        await callApi('POST', '/sync/connections', {
          pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        })
      ).status,
    ).toBe(409);

    await connections();
    const done = (await connections()).find((item) => item.id === connection.id);
    expect(done?.accounts.map((account) => account.name)).toEqual(['Inter']);
    const brought = db.transactions.filter((tx) => tx.accountId === done?.accounts[0]?.accountId);
    expect(done?.history).toMatchObject({
      status: 'done',
      fromOn: brought.map((tx) => tx.occurredOn).sort()[0],
      transactionCount: brought.length,
    });
    // The import marks the transfer and the invoice payment by itself.
    expect(
      brought
        .filter((tx) => tx.natureSetBy === 'system' && tx.nature !== 'income')
        .map((tx) => tx.nature),
    ).toEqual(['transfer', 'invoice_payment']);
  });

  it('refuses the item, the keys or the Pluggy the way the Pluggy would', async () => {
    const refused = async (prefix: string) => {
      const answer = await callApi('POST', '/sync/connections', {
        pluggyItemId: `${prefix}-0000-4000-8000-000000000000`,
      });

      return [answer.status, (answer.json as { code: string }).code];
    };
    expect(await refused('00000007')).toEqual([422, 'SYNC_ITEM_NOT_FOUND']);
    expect(await refused('00000008')).toEqual([422, 'SYNC_PROVIDER_UNAVAILABLE']);
    expect(await refused('00000009')).toEqual([422, 'SYNC_CREDENTIALS_INVALID']);

    const unavailable = await callApi('PUT', '/sync/settings', {
      clientId: 'abc',
      clientSecret: 'unavailable',
    });
    expect([unavailable.status, (unavailable.json as { code: string }).code]).toEqual([
      422,
      'SYNC_PROVIDER_UNAVAILABLE',
    ]);
    await callApi('PUT', '/sync/settings', { clientId: 'unavailable', clientSecret: 'segredo' });
    expect(((await callApi('POST', '/sync/connect-token')).json as { code: string }).code).toBe(
      'SYNC_PROVIDER_UNAVAILABLE',
    );
    await callApi('PUT', '/sync/settings', { clientId: 'invalid', clientSecret: 'segredo' });
    expect(((await callApi('POST', '/sync/connect-token')).json as { code: string }).code).toBe(
      'SYNC_CREDENTIALS_INVALID',
    );
  });

  it('ends a round the way the item says: error with a code, quietly, or without touching the connection', async () => {
    const connect = async (prefix: string) => {
      const answer = await callApi('POST', '/sync/connections', {
        pluggyItemId: `${prefix}-0000-4000-8000-000000000000`,
      });
      const { id } = connectionDtoSchema.parse(answer.json);
      await connections();

      return {
        connection: (await connections()).find((item) => item.id === id),
        runs: listResponseSchema(runDtoSchema).parse(
          (await callApi('GET', `/sync/connections/${id}/runs`)).json,
        ).items,
      };
    };

    for (const [prefix, code] of [
      ['00000001', 'LOGIN_ERROR'],
      ['00000002', 'CONSENT_REVOKED'],
      ['00000003', 'PROVIDER_ERROR'],
      ['00000004', 'STALE_DATA'],
    ] as const) {
      const { connection, runs } = await connect(prefix);
      expect(connection).toMatchObject({ status: 'error', errorCode: code });
      expect(connection?.history.status).toBe('running');
      expect(runs[0]).toMatchObject({ status: 'error', errorCode: code });
    }

    const updating = await connect('00000005');
    expect(updating.connection).toMatchObject({ status: 'active', errorCode: null });
    expect(updating.connection?.history).toMatchObject({ status: 'running' });
    expect(updating.runs[0]).toMatchObject({ status: 'success', createdCount: 0 });

    // The Pluggy unreachable ends the run in error but does not move a connection that was working.
    const [nubank] = (await connections()).filter((item) => item.institutionName === 'Nubank');
    const item = db.connections.find((entry) => entry.id === nubank?.id);
    if (item) item.pluggyItemId = '00000006-0000-4000-8000-000000000000';
    await callApi('POST', `/sync/connections/${nubank?.id}/runs`);
    await connections();
    const after = (await connections()).find((entry) => entry.id === nubank?.id);
    expect(after).toMatchObject({ status: 'active', errorCode: null });
    expect(after?.lastRun).toMatchObject({ status: 'error', errorCode: 'PROVIDER_ERROR' });
  });

  it('answers the errors of a run in the order of the API', async () => {
    expect(
      (await callApi('POST', '/sync/connections/0194f3a0-0000-7000-8000-999999999999/runs')).status,
    ).toBe(404);
    const [bradesco, nubank] = await connections();
    await callApi('POST', `/sync/connections/${bradesco?.id}/runs`);
    db.syncSettings = null;
    const notConfigured = await callApi('POST', `/sync/connections/${bradesco?.id}/runs`);
    expect([notConfigured.status, (notConfigured.json as { code: string }).code]).toEqual([
      422,
      'SYNC_NOT_CONFIGURED',
    ]);

    await callApi('DELETE', `/sync/connections/${nubank?.id}`);
    const disconnected = await callApi('POST', `/sync/connections/${nubank?.id}/runs`);
    expect((disconnected.json as { code: string }).code).toBe('SYNC_CONNECTION_DISCONNECTED');
  });

  it('opens no round for an empty choice, and takes any other choice as not pending', async () => {
    const [bradesco] = await connections();
    const runsBefore = db.runs.length;
    expect(
      (await callApi('PUT', `/sync/connections/${bradesco?.id}/account-matches`, { matches: [] }))
        .status,
    ).toBe(202);
    expect(db.runs).toHaveLength(runsBefore);
    const invalid = await callApi('PUT', `/sync/connections/${bradesco?.id}/account-matches`, {
      matches: [{ pluggyAccountId: 'x', accountId: null }],
    });
    expect((invalid.json as { code: string }).code).toBe('SYNC_ACCOUNT_MATCH_INVALID');
  });

  it('refuses to connect, run and choose while a backup or restore is running', async () => {
    const [bradesco] = await connections();
    db.backup.running = true;
    const code = async (method: string, path: string, body?: unknown) => {
      const answer = await callApi(method, path, body);

      return [answer.status, (answer.json as { code?: string } | null)?.code];
    };

    expect(
      await code('POST', '/sync/connections', {
        pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      }),
    ).toEqual([409, 'BACKUP_IN_PROGRESS']);
    expect(await code('POST', `/sync/connections/${bradesco?.id}/runs`)).toEqual([
      409,
      'BACKUP_IN_PROGRESS',
    ]);
    expect(
      await code('PUT', `/sync/connections/${bradesco?.id}/account-matches`, { matches: [] }),
    ).toEqual([409, 'BACKUP_IN_PROGRESS']);
    // The contract has no such error for disconnecting.
    expect((await callApi('DELETE', `/sync/connections/${bradesco?.id}`)).status).toBe(204);
  });

  it('disconnects, turning the accounts manual with the last bank balance', async () => {
    const [bradesco] = await connections();
    const before = (await callApi('GET', '/accounts')).json as {
      items: { name: string; balanceCents: number | null }[];
    };
    expect((await callApi('DELETE', `/sync/connections/${bradesco?.id}`)).status).toBe(204);
    expect((await callApi('DELETE', `/sync/connections/${bradesco?.id}`)).status).toBe(204);
    const after = (await callApi('GET', '/accounts')).json as {
      items: { name: string; source: string; balanceCents: number | null; connection: unknown }[];
    };
    expect(
      db.transactions
        .filter(
          (tx) => tx.nature === 'balance_adjustment' && tx.description.includes('desconectar'),
        )
        .map((tx) => tx.description),
    ).toEqual(['Ajuste de saldo: Saldo do banco ao desconectar']);
    const account = after.items.find((item) => item.name === 'Bradesco');
    expect(account).toMatchObject({ source: 'manual', connection: null });
    expect(account?.balanceCents).toBe(
      before.items.find((item) => item.name === 'Bradesco')?.balanceCents,
    );
    expect(
      (
        await callApi('PUT', `/sync/connections/${bradesco?.id}/account-matches`, {
          matches: [{ pluggyAccountId: 'x', accountId: null }],
        })
      ).status,
    ).toBe(422);
  });

  it('brings a disconnected bank back: history running again, balances from the bank in the round', async () => {
    const [, nubank] = await connections();
    await callApi('DELETE', `/sync/connections/${nubank?.id}`);
    const item = db.connections.find((entry) => entry.id === nubank?.id);

    const answer = await callApi('POST', '/sync/connections', { pluggyItemId: item?.pluggyItemId });
    expect(answer.status).toBe(202);
    const back = connectionDtoSchema.parse(answer.json);
    expect(back.status).toBe('active');
    expect(back.history.status).toBe('running');
    expect(back.lastRun).toMatchObject({ trigger: 'first_connection', status: 'running' });
    const reconnected = db.accounts.filter((account) => item?.accountIds.includes(account.id));
    expect(reconnected.every((account) => account.source === 'pluggy')).toBe(true);
    expect(reconnected.every((account) => account.bankBalanceCents === null)).toBe(true);

    await connections();
    expect(reconnected.every((account) => account.bankBalanceCents !== null)).toBe(true);
    expect((await connections()).find((entry) => entry.id === nubank?.id)?.history).toMatchObject({
      status: 'done',
      fromOn: null,
      transactionCount: 0,
    });
  });
});
