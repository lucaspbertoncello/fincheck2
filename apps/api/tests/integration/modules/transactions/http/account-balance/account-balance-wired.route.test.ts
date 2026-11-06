import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { adjustBalanceResponseSchema } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { balanceHistoryDtoSchema } from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';

// `accounts` and `transactions` talking through the ports, mounted the way `main` mounts them: the
// balance of a manual account, the curve of the month and the adjustment, on a real SQLite file.
describe('balance of the accounts, wired to transactions', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let walletId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    walletId = await insertTestAccount(database.db, { type: 'wallet', institution_code: 'wallet' });
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

  const balanceOf = async (id: string) => {
    const response = await send('GET', `/accounts/${id}`);

    return accountDtoSchema.parse(await response.json()).balanceCents;
  };

  const adjust = async (id: string, body: Record<string, unknown>) => {
    const response = await send('POST', `/accounts/${id}/balance-adjustments`, body);
    expect(response.status).toBe(201);

    return adjustBalanceResponseSchema.parse(await response.json());
  };

  describe('the balance of a manual account', () => {
    it('is 0, not null, for an account with no transaction', async () => {
      expect(await balanceOf(walletId)).toBe(0);
    });

    it('adds the transactions dated up to today, whatever their nature', async () => {
      await insertTestTransaction(database.db, walletId, {
        amount_cents: 10000,
        nature: 'income',
        occurred_on: '2026-11-01',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -2500,
        occurred_on: '2026-11-06',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: 700,
        nature: 'balance_adjustment',
        occurred_on: '2026-10-01',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -3000,
        nature: 'transfer',
        occurred_on: '2026-11-02',
      });
      // Tomorrow is not counted yet.
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -9999,
        occurred_on: '2026-11-07',
      });

      expect(await balanceOf(walletId)).toBe(10000 - 2500 + 700 - 3000);
    });

    it('leaves out what is ignored and what the bank removed, unless Lucas edited it', async () => {
      await insertTestTransaction(database.db, walletId, { amount_cents: 10000 });
      await insertTestTransaction(database.db, walletId, { amount_cents: -111, ignored_at: NOW });
      const bank = {
        origin: 'bank' as const,
        bank_description: 'PADARIA',
        bank_occurred_on: '2026-11-05',
        bank_status: 'posted' as const,
        bank_removed_at: NOW,
      };
      await insertTestTransaction(database.db, walletId, {
        ...bank,
        description: 'PADARIA',
        amount_cents: -222,
        bank_amount_cents: -222,
      });
      await insertTestTransaction(database.db, walletId, {
        ...bank,
        description: 'Padaria editada',
        amount_cents: -333,
        bank_amount_cents: -300,
      });

      expect(await balanceOf(walletId)).toBe(10000 - 333);
    });

    it('is what the list of accounts shows, per account', async () => {
      const other = await insertTestAccount(database.db, { name: 'Poupança', type: 'savings' });
      await insertTestTransaction(database.db, walletId, { amount_cents: 500 });
      await insertTestTransaction(database.db, other, { amount_cents: -800 });

      const response = await send('GET', '/accounts');
      const items = ((await response.json()) as { items: unknown[] }).items.map((item) =>
        accountDtoSchema.parse(item),
      );

      expect(Object.fromEntries(items.map((item) => [item.id, item.balanceCents]))).toEqual({
        [walletId]: 500,
        [other]: -800,
      });
    });

    it('does not show a balance on a manual card, and the bank balance of a Pluggy account as it came', async () => {
      const card = await insertTestCreditCard(database.db);
      const pluggy = await insertTestAccount(database.db, {
        source: 'pluggy',
        bank_balance_cents: 123456,
        bank_balance_at: NOW,
      });
      await insertTestTransaction(database.db, card, { method: 'credit', amount_cents: -9000 });
      await insertTestTransaction(database.db, pluggy, { amount_cents: -777 });

      expect(await balanceOf(card)).toBeNull();
      expect(await balanceOf(pluggy)).toBe(123456);
    });
  });

  describe('POST /accounts/:id/balance-adjustments', () => {
    it('records the difference as a balance adjustment and shows the target', async () => {
      await insertTestTransaction(database.db, walletId, { amount_cents: 12000, nature: 'income' });

      const result = await adjust(walletId, {
        targetBalanceCents: 9500,
        note: 'Contei a carteira',
      });

      expect(result.adjustment.amountCents).toBe(-2500);
      expect(result.account.balanceCents).toBe(9500);
      const row = await database.db
        .selectFrom('transactions')
        .select(['nature', 'origin', 'method', 'description', 'amount_cents', 'occurred_on'])
        .where('id', '=', result.adjustment.transactionId)
        .executeTakeFirstOrThrow();
      expect(row).toEqual({
        nature: 'balance_adjustment',
        origin: 'manual',
        method: 'other',
        description: 'Ajuste de saldo: Contei a carteira',
        amount_cents: -2500,
        occurred_on: '2026-11-06',
      });
    });

    it('makes the balance equal the target every time, from any balance to any target', async () => {
      const targets = [5000, 0, -1234, -1234 + 1, 99999999, -50, 0, 7];
      for (const target of targets) {
        if (target === (await balanceOf(walletId))) continue;
        const result = await adjust(walletId, { targetBalanceCents: target });

        expect(result.account.balanceCents).toBe(target);
        expect(await balanceOf(walletId)).toBe(target);
      }
    });

    it('works from zero, with a negative target, and dated in the past', async () => {
      const first = await adjust(walletId, { targetBalanceCents: -4000, occurredOn: '2026-11-01' });

      expect(first.adjustment.amountCents).toBe(-4000);
      expect(first.account.balanceCents).toBe(-4000);
    });

    it('answers 422 when the target is the balance, 404, 400 for a future date, and 422 for a card, a Pluggy account and an archived one', async () => {
      await expectError(
        await send('POST', `/accounts/${walletId}/balance-adjustments`, { targetBalanceCents: 0 }),
        422,
        'ACCOUNT_BALANCE_UNCHANGED',
      );
      await expectError(
        await send('POST', `/accounts/${generateId()}/balance-adjustments`, {
          targetBalanceCents: 1,
        }),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      await expectError(
        await send('POST', `/accounts/${walletId}/balance-adjustments`, {
          targetBalanceCents: 1,
          occurredOn: '2026-11-07',
        }),
        400,
        'VALIDATION_FAILED',
      );
      const card = await insertTestCreditCard(database.db);
      const pluggy = await insertTestAccount(database.db, { source: 'pluggy' });
      const archived = await insertTestAccount(database.db, {
        archived_at: '2026-10-01T00:00:00.000Z',
      });
      for (const [id, code] of [
        [card, 'ACCOUNT_BALANCE_NOT_ADJUSTABLE'],
        [pluggy, 'ACCOUNT_BALANCE_NOT_ADJUSTABLE'],
        [archived, 'ACCOUNT_ARCHIVED'],
      ] as const) {
        await expectError(
          await send('POST', `/accounts/${id}/balance-adjustments`, { targetBalanceCents: 1 }),
          422,
          code,
        );
      }
      expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });
  });

  describe('GET /accounts/:id/balance-history', () => {
    const history = async (id: string, month: string) => {
      const response = await send('GET', `/accounts/${id}/balance-history?month=${month}`);
      expect(response.status).toBe(200);

      return balanceHistoryDtoSchema.parse(await response.json());
    };

    it('gives one point a day up to today, with the balance at the end of the day', async () => {
      await insertTestTransaction(database.db, walletId, {
        amount_cents: 10000,
        occurred_on: '2026-10-30',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -2500,
        occurred_on: '2026-11-04',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -500,
        occurred_on: '2026-11-04',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -999,
        ignored_at: NOW,
        occurred_on: '2026-11-04',
      });

      const dto = await history(walletId, '2026-11');

      expect(dto.points.map((point) => point.date)).toEqual([
        '2026-11-01',
        '2026-11-02',
        '2026-11-03',
        '2026-11-04',
        '2026-11-05',
        '2026-11-06',
      ]);
      expect(dto.points.map((point) => point.balanceCents)).toEqual([
        10000, 10000, 10000, 7000, 7000, 7000,
      ]);
      // The last point is the balance the account shows.
      expect(dto.points.at(-1)?.balanceCents).toBe(await balanceOf(walletId));
    });

    it('covers a whole past month', async () => {
      await insertTestTransaction(database.db, walletId, {
        amount_cents: 3000,
        occurred_on: '2026-09-15',
      });
      await insertTestTransaction(database.db, walletId, {
        amount_cents: -1000,
        occurred_on: '2026-10-10',
      });

      const dto = await history(walletId, '2026-10');

      expect(dto.points).toHaveLength(31);
      expect(dto.points[0]).toEqual({ date: '2026-10-01', balanceCents: 3000 });
      expect(dto.points[9]).toEqual({ date: '2026-10-10', balanceCents: 2000 });
      expect(dto.points.at(-1)).toEqual({ date: '2026-10-31', balanceCents: 2000 });
    });

    it('goes backwards from the bank balance on a Pluggy account', async () => {
      const pluggy = await insertTestAccount(database.db, {
        source: 'pluggy',
        bank_balance_cents: 8000,
        bank_balance_at: NOW,
      });
      await insertTestTransaction(database.db, pluggy, {
        amount_cents: -2000,
        occurred_on: '2026-11-04',
      });
      await insertTestTransaction(database.db, pluggy, {
        amount_cents: 500,
        occurred_on: '2026-11-06',
      });
      await insertTestTransaction(database.db, pluggy, {
        amount_cents: -9999,
        ignored_at: NOW,
        occurred_on: '2026-11-05',
      });

      const dto = await history(pluggy, '2026-11');

      expect(dto.points.map((point) => point.balanceCents)).toEqual([
        9500, 9500, 9500, 7500, 7500, 8000,
      ]);
      expect(dto.points.at(-1)?.balanceCents).toBe(8000);
    });

    it('refuses a card, a month after the current one, a missing month and an unknown account', async () => {
      const card = await insertTestCreditCard(database.db);

      await expectError(
        await send('GET', `/accounts/${card}/balance-history?month=2026-11`),
        422,
        'ACCOUNT_HISTORY_NOT_AVAILABLE',
      );
      await expectError(
        await send('GET', `/accounts/${walletId}/balance-history?month=2026-12`),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('GET', `/accounts/${walletId}/balance-history`),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('GET', `/accounts/${generateId()}/balance-history?month=2026-11`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });
  });

  describe('POST /accounts with an initial balance (achado P3-1 da revisão 2)', () => {
    it('creates the account with the first adjustment instead of failing, and shows it in the history', async () => {
      const response = await send('POST', '/accounts', {
        type: 'checking',
        name: 'Nubank',
        institutionCode: 'nubank',
        initialBalanceCents: 25000,
      });

      expect(response.status).toBe(201);
      const dto = accountDtoSchema.parse(await response.json());
      expect(dto.balanceCents).toBe(25000);
      const history = balanceHistoryDtoSchema.parse(
        await (await send('GET', `/accounts/${dto.id}/balance-history?month=2026-11`)).json(),
      );
      expect(history.points.at(-1)?.balanceCents).toBe(25000);
    });
  });
});
