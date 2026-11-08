import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { DeleteAccountUseCase } from '#/modules/accounts/application/account/delete-account.usecase.ts';
import { GetDeletionImpactUseCase } from '#/modules/accounts/application/account/get-deletion-impact.usecase.ts';
import { createAccountDeletionRoute } from '#/modules/accounts/http/account/account-deletion.route.ts';
import { DeleteAccountController } from '#/modules/accounts/http/account/delete-account.controller.ts';
import { GetDeletionImpactController } from '#/modules/accounts/http/account/get-deletion-impact.controller.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

// The route of the deletion over the real accounts store and doubles that stand for the owners, to
// check the order and the unit of work of the use case on its own. The routes of `main`, with the
// real owners, are in `account-deletion-wired.route.test.ts`.
describe('deletion routes of accounts', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let calls: string[];
  let failRules: boolean;
  let app: Hono;

  beforeEach(async () => {
    database = await createTestDatabase();
    calls = [];
    failRules = false;
    const accounts = new KyselyAccountRepository(database.db);
    app = new Hono().onError(handleError).route(
      '/',
      createAccountDeletionRoute({
        getDeletionImpact: new GetDeletionImpactController(
          new GetDeletionImpactUseCase(
            accounts,
            { countsOf: async () => ({ transactionCount: 142, installmentPlanCount: 3 }) },
            { countOf: async () => 7 },
            { countOf: async () => 2 },
            {
              connectionsOf: async (ids) =>
                new Map(
                  ids.map((id) => [
                    id,
                    {
                      connectionId: generateId(),
                      status: 'active' as const,
                      errorCode: null,
                      lastBankUpdateAt: null,
                    },
                  ]),
                ),
            },
          ),
        ),
        deleteAccount: new DeleteAccountController(
          new DeleteAccountUseCase(
            accounts,
            { execute: async () => void calls.push('invoices') },
            { execute: async () => void calls.push('transactions') },
            {
              execute: async () => {
                calls.push('rules');
                if (failRules) throw new Error('rules failed');
              },
            },
            new KyselyUnitOfWork(database.db),
          ),
        ),
      }),
    );
  });

  afterEach(async () => {
    await database.destroy();
  });

  const expectNotFound = async (response: Response) => {
    expect(response.status).toBe(404);
    expect(apiErrorSchema.parse(await response.json()).code).toBe('ACCOUNT_NOT_FOUND');
  };

  it('GET /accounts/:id/deletion-impact answers the counts and the Pluggy warning', async () => {
    const pluggy = await insertTestAccount(database.db, {
      source: 'pluggy',
      type: 'credit_card',
      bank_balance_cents: 0,
      bank_balance_at: '2026-11-06T10:00:00.000Z',
    });

    const response = await app.request(`/accounts/${pluggy}/deletion-impact`);

    expect(response.status).toBe(200);
    expect(deletionImpactDtoSchema.parse(await response.json())).toEqual({
      transactionCount: 142,
      installmentPlanCount: 3,
      invoiceCount: 7,
      ruleCount: 2,
      isPluggy: true,
      returnsOnNextSync: true,
    });
  });

  it('GET /accounts/:id/deletion-impact answers 404 for an unknown id', async () => {
    await expectNotFound(await app.request(`/accounts/${generateId()}/deletion-impact`));
  });

  it('DELETE /accounts/:id answers 204 and the account and its card data are gone', async () => {
    const id = await insertTestAccount(database.db, { type: 'credit_card' });
    await database.db
      .insertInto('credit_cards')
      .values({
        account_id: id,
        brand: 'visa',
        last4: null,
        closing_day: 1,
        due_day: 8,
        limit_cents: null,
        theme_id: null,
      })
      .execute();

    const response = await app.request(`/accounts/${id}`, { method: 'DELETE' });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(calls).toEqual(['invoices', 'transactions', 'rules']);
    expect(await database.db.selectFrom('accounts').select('id').execute()).toEqual([]);
    expect(await database.db.selectFrom('credit_cards').select('account_id').execute()).toEqual([]);
  });

  it('DELETE /accounts/:id deletes nothing if an owner fails (one unit of work)', async () => {
    const id = await insertTestAccount(database.db);
    failRules = true;
    const spy = console.error;
    console.error = () => undefined;
    try {
      const response = await app.request(`/accounts/${id}`, { method: 'DELETE' });

      expect(response.status).toBe(500);
    } finally {
      console.error = spy;
    }

    expect(await database.db.selectFrom('accounts').select('id').execute()).toEqual([{ id }]);
  });

  it('DELETE /accounts/:id answers 404 for an unknown id', async () => {
    await expectNotFound(await app.request(`/accounts/${generateId()}`, { method: 'DELETE' }));
  });
});
