import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { adjustBalanceResponseSchema } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { balanceHistoryDtoSchema } from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AdjustAccountBalanceUseCase } from '#/modules/accounts/application/account/adjust-account-balance.usecase.ts';
import { GetBalanceHistoryUseCase } from '#/modules/accounts/application/account/get-balance-history.usecase.ts';
import { AdjustAccountBalanceController } from '#/modules/accounts/http/account/adjust-account-balance.controller.ts';
import { createAccountBalanceRoute } from '#/modules/accounts/http/account/account-balance.route.ts';
import { GetBalanceHistoryController } from '#/modules/accounts/http/account/get-balance-history.controller.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { createInMemoryLedger } from '#tests/support/accounts/account/create-in-memory-ledger.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

// These routes are not mounted in `main` yet (they wait for `transactions`): the test mounts them
// by hand, over the real accounts store and a ledger double that stands for the owner.
describe('balance routes of accounts', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let ledger: ReturnType<typeof createInMemoryLedger>;
  let app: Hono;

  beforeEach(async () => {
    database = await createTestDatabase();
    ledger = createInMemoryLedger('2026-11-06');
    const accounts = new KyselyAccountRepository(database.db);
    const clock = createFixedClock('2026-11-06T15:00:00.000Z');
    const presenter = new AccountPresenter(ledger.manualBalances, {
      connectionsOf: async () => new Map(),
    });
    app = new Hono().onError(handleError).route(
      '/',
      createAccountBalanceRoute({
        getBalanceHistory: new GetBalanceHistoryController(
          new GetBalanceHistoryUseCase(accounts, ledger.movements, clock),
        ),
        adjustAccountBalance: new AdjustAccountBalanceController(
          new AdjustAccountBalanceUseCase(
            accounts,
            ledger.manualBalances,
            ledger.balanceAdjustments,
            presenter,
            new KyselyUnitOfWork(database.db),
            clock,
          ),
        ),
      }),
    );
  });

  afterEach(async () => {
    await database.destroy();
  });

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  describe('GET /accounts/:id/balance-history', () => {
    it('answers one point a day of the current month, up to today', async () => {
      const id = await insertTestAccount(database.db);
      ledger.ledger.push(
        { accountId: id, amountCents: 10000, occurredOn: '2026-10-30' },
        { accountId: id, amountCents: -2500, occurredOn: '2026-11-04' },
      );

      const response = await send('GET', `/accounts/${id}/balance-history?month=2026-11`);

      expect(response.status).toBe(200);
      const dto = balanceHistoryDtoSchema.parse(await response.json());
      expect(dto.points).toHaveLength(6);
      expect(dto.points[0]).toEqual({ date: '2026-11-01', balanceCents: 10000 });
      expect(dto.points[5]).toEqual({ date: '2026-11-06', balanceCents: 7500 });
    });

    it('refuses a missing, malformed or future month with 400', async () => {
      const id = await insertTestAccount(database.db);

      await expectError(
        await send('GET', `/accounts/${id}/balance-history`),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('GET', `/accounts/${id}/balance-history?month=11-2026`),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('GET', `/accounts/${id}/balance-history?month=2026-12`),
        400,
        'VALIDATION_FAILED',
      );
    });

    it('answers 404 for an unknown id and 422 for a card', async () => {
      const card = await insertTestAccount(database.db, { type: 'credit_card' });

      await expectError(
        await send('GET', `/accounts/${generateId()}/balance-history?month=2026-11`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      await expectError(
        await send('GET', `/accounts/${card}/balance-history?month=2026-11`),
        422,
        'ACCOUNT_HISTORY_NOT_AVAILABLE',
      );
    });
  });

  describe('POST /accounts/:id/balance-adjustments', () => {
    it('answers 201 with the account at the target balance and the signed adjustment', async () => {
      const id = await insertTestAccount(database.db, {
        type: 'wallet',
        institution_code: 'wallet',
      });
      ledger.ledger.push({ accountId: id, amountCents: 12000, occurredOn: '2026-11-01' });

      const response = await send('POST', `/accounts/${id}/balance-adjustments`, {
        targetBalanceCents: 9500,
      });

      expect(response.status).toBe(201);
      const dto = adjustBalanceResponseSchema.parse(await response.json());
      expect(dto.adjustment.amountCents).toBe(-2500);
      expect(accountDtoSchema.parse(dto.account).balanceCents).toBe(9500);
      expect(ledger.adjustments).toHaveLength(1);
    });

    it('refuses with the codes of the contract', async () => {
      const manual = await insertTestAccount(database.db);
      const pluggy = await insertTestAccount(database.db, {
        source: 'pluggy',
        bank_balance_cents: 1,
        bank_balance_at: '2026-11-06T10:00:00.000Z',
      });
      const archived = await insertTestAccount(database.db, {
        archived_at: '2026-10-01T00:00:00.000Z',
      });
      const adjust = (id: string, body: unknown) =>
        send('POST', `/accounts/${id}/balance-adjustments`, body);

      await expectError(
        await adjust(pluggy, { targetBalanceCents: 5 }),
        422,
        'ACCOUNT_BALANCE_NOT_ADJUSTABLE',
      );
      await expectError(await adjust(archived, { targetBalanceCents: 5 }), 422, 'ACCOUNT_ARCHIVED');
      await expectError(
        await adjust(manual, { targetBalanceCents: 0 }),
        422,
        'ACCOUNT_BALANCE_UNCHANGED',
      );
      await expectError(
        await adjust(manual, { targetBalanceCents: 5, occurredOn: '2026-11-07' }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await adjust(manual, { targetBalanceCents: 1.5 }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(await adjust(manual, { note: 'x' }), 400, 'VALIDATION_FAILED');
      await expectError(
        await adjust(generateId(), { targetBalanceCents: 5 }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      expect(ledger.adjustments).toEqual([]);
    });
  });
});
