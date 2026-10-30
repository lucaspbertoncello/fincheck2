import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { connectionDtoSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { connectTokenDtoSchema } from '@fincheck/shared/sync/connect-token/connect-token.schema.ts';
import { runDtoSchema } from '@fincheck/shared/sync/run/run.schema.ts';
import { syncSettingsDtoSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';
import { describe, expect, it } from 'vitest';

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

  it('connects a new bank: the Livre is partial until the first run ends', async () => {
    const created = await callApi('POST', '/sync/connections', {
      pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(created.status).toBe(202);
    const connection = connectionDtoSchema.parse(created.json);
    expect(connection.history.status).toBe('running');
    expect(connection.accounts).toEqual([]);
    expect(
      (
        await callApi('POST', '/sync/connections', {
          pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        })
      ).status,
    ).toBe(409);

    const partial = (await callApi('GET', '/dashboard/free-balance')).json as {
      isPartial: boolean;
    };
    expect(partial.isPartial).toBe(true);
    await connections();
    const done = (await connections()).find((item) => item.id === connection.id);
    expect(done?.history.status).toBe('done');
    expect(
      ((await callApi('GET', '/dashboard/free-balance')).json as { isPartial: boolean }).isPartial,
    ).toBe(false);
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
});
