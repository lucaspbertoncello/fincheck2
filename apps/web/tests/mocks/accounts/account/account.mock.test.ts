import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { adjustBalanceResponseSchema } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { balanceHistoryDtoSchema } from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/clock.constant.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const listSchema = listResponseSchema(accountDtoSchema);

async function listAccounts(path = '/accounts') {
  const { json } = await callApi('GET', path);

  return listSchema.parse(json).items;
}

describe('accounts routes', () => {
  it('lists the active accounts in contract order, and the archived on request', async () => {
    const items = await listAccounts();
    expect(items.map((account) => account.name)).toEqual([
      'Bradesco',
      'Nubank',
      'Carteira',
      'Bradesco Black',
      'Roxinho',
    ]);
    expect(items.every((account) => account.archivedAt === null)).toBe(true);
    expect((await listAccounts('/accounts?includeArchived=true')).length).toBe(items.length + 1);
  });

  it('covers a Pluggy account with old data, a manual wallet and cards', async () => {
    const items = await listAccounts();
    const bradesco = items.find((account) => account.name === 'Bradesco');
    expect(bradesco?.connection?.lastBankUpdateAt).not.toBeNull();
    const wallet = items.find((account) => account.type === 'wallet');
    expect(wallet).toMatchObject({ source: 'manual', connection: null });
    expect(wallet?.balanceCents).toBe(20_000 - 3500 - 1200);
    expect(items.filter((account) => account.type === 'credit_card')).toHaveLength(2);
  });

  it('reads one account, its balance history, deletion impact and answers the error body', async () => {
    const [first] = await listAccounts();
    const id = first?.id ?? '';
    expect(accountDtoSchema.parse((await callApi('GET', `/accounts/${id}`)).json).id).toBe(id);
    const history = balanceHistoryDtoSchema.parse(
      (await callApi('GET', `/accounts/${id}/balance-history?month=${CURRENT_MONTH}`)).json,
    );
    expect(history.points.at(-1)?.balanceCents).toBe(first?.balanceCents);
    expect(
      deletionImpactDtoSchema.parse((await callApi('GET', `/accounts/${id}/deletion-impact`)).json)
        .isPluggy,
    ).toBe(true);

    const missing = await callApi('GET', '/accounts/0194f3a0-0000-7000-8000-999999999999');
    expect(missing.status).toBe(404);
    expect(apiErrorSchema.parse(missing.json).code).toBe('ACCOUNT_NOT_FOUND');
    const invalid = await callApi('GET', `/accounts/${id}/balance-history`);
    expect(invalid.status).toBe(400);
    expect(apiErrorSchema.parse(invalid.json).code).toBe('VALIDATION_FAILED');
  });

  it('creates a manual account, adjusts the wallet balance and archives', async () => {
    const created = await callApi('POST', '/accounts', {
      type: 'savings',
      name: 'Reserva',
      institutionCode: 'inter',
      initialBalanceCents: 50_000,
    });
    expect(created.status).toBe(201);
    expect(accountDtoSchema.parse(created.json)).toMatchObject({
      source: 'manual',
      balanceCents: 50_000,
    });

    const wallet = (await listAccounts()).find((account) => account.type === 'wallet');
    const adjusted = await callApi('POST', `/accounts/${wallet?.id}/balance-adjustments`, {
      targetBalanceCents: 9500,
    });
    expect(adjusted.status).toBe(201);
    const result = adjustBalanceResponseSchema.parse(adjusted.json);
    expect(result.account.balanceCents).toBe(9500);
    expect(result.adjustment.amountCents).toBe(9500 - (wallet?.balanceCents ?? 0));
    expect(
      (
        await callApi('POST', `/accounts/${wallet?.id}/balance-adjustments`, {
          targetBalanceCents: 9500,
        })
      ).status,
    ).toBe(422);

    const archived = accountDtoSchema.parse(
      (await callApi('POST', `/accounts/${wallet?.id}/archive`)).json,
    );
    expect(archived.archivedAt).not.toBeNull();
    expect((await callApi('POST', `/accounts/${wallet?.id}/archive`)).status).toBe(409);
    expect(
      accountDtoSchema.parse((await callApi('POST', `/accounts/${wallet?.id}/unarchive`)).json)
        .archivedAt,
    ).toBeNull();
  });

  it('refuses a request that breaks the contract and removes an account with its transactions', async () => {
    const bad = await callApi('POST', '/accounts', { type: 'credit_card', name: 'Sem dados' });
    expect(bad.status).toBe(400);

    const wallet = (await listAccounts()).find((account) => account.type === 'wallet');
    expect((await callApi('DELETE', `/accounts/${wallet?.id}`)).status).toBe(204);
    expect((await callApi('GET', `/accounts/${wallet?.id}`)).status).toBe(404);
  });
});
