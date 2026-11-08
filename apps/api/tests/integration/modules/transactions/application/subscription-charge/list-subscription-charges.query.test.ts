import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ListSubscriptionChargesQuery } from '#/modules/transactions/application/subscription-charge/list-subscription-charges.query.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';

describe('ListSubscriptionChargesQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: ListSubscriptionChargesQuery;
  let card: string;
  let checking: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new ListSubscriptionChargesQuery(database.db);
    card = await insertTestCreditCard(database.db);
    checking = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const onCard = (on: string, cents = 5590, description = 'NETFLIX.COM', overrides = {}) =>
    insertTestExpense(database.db, card, {
      cents,
      on,
      description,
      overrides: { method: 'credit', ...overrides },
    });

  describe('listAccountCharges', () => {
    it('lists the debits of the accounts between the days, oldest first, with the amount positive', async () => {
      const second = await onCard('2026-10-12');
      const first = await onCard('2026-09-12', 5000);
      await onCard('2026-08-12');
      await onCard('2026-11-12');
      await insertTestExpense(database.db, checking, { cents: 1000, on: '2026-10-05' });

      const found = await query.listAccountCharges({
        accountIds: [card],
        from: '2026-09-01',
        to: '2026-10-31',
      });

      expect(found).toEqual([
        {
          transactionId: first,
          accountId: card,
          method: 'credit',
          description: 'NETFLIX.COM',
          amountCents: 5000,
          occurredOn: '2026-09-12',
        },
        {
          transactionId: second,
          accountId: card,
          method: 'credit',
          description: 'NETFLIX.COM',
          amountCents: 5590,
          occurredOn: '2026-10-12',
        },
      ]);
    });

    it('answers nothing for no account, leaves out credits, ignored and removed ones, and other natures', async () => {
      await insertTestIncome(database.db, card, { cents: 5590, on: '2026-10-12' });
      await onCard('2026-10-12', 1, 'X', { ignored_at: '2026-10-13T12:00:00.000Z' });
      await onCard('2026-10-12', 1, 'X', { bank_removed_at: '2026-10-13T12:00:00.000Z' });
      await onCard('2026-10-12', 1, 'X', { nature: 'transfer' });
      await onCard('2026-10-12', 1, 'X', { nature: 'invoice_payment' });

      expect(
        await query.listAccountCharges({ accountIds: [], from: '2026-01-01', to: '2026-12-31' }),
      ).toEqual([]);
      expect(
        await query.listAccountCharges({
          accountIds: [card],
          from: '2026-01-01',
          to: '2026-12-31',
        }),
      ).toEqual([]);
    });
  });

  describe('listCardPurchases', () => {
    it('lists the purchases on cards, with no debit of a checking account and no installment', async () => {
      const purchase = await onCard('2026-10-12');
      await insertTestExpense(database.db, checking, {
        cents: 5590,
        on: '2026-10-12',
        description: 'NETFLIX.COM',
        overrides: { method: 'pix' },
      });
      const plan = await insertTestInstallmentPlan(database.db, card);
      await onCard('2026-10-12', 3000, 'CADEIRA 1/3', {
        installment_plan_id: plan,
        installment_number: 1,
      });

      const found = await query.listCardPurchases({ from: '2026-10-01', to: '2026-10-31' });

      expect(found.map((item) => item.transactionId)).toEqual([purchase]);
    });
  });
});
