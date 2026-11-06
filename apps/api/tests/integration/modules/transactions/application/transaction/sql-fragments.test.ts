import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { competenceOnSql } from '#/modules/transactions/application/transaction/competence-on-sql.util.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { inReviewSql } from '#/modules/transactions/application/transaction/in-review-sql.util.ts';
import { KyselyInstallmentPlanRepository } from '#/modules/transactions/infra/installment-plan/installment-plan.repository.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The queries filter and sum in SQL; the entity decides in code. These tests put the two side by
// side over every combination, so a rule changed in one place and not in the other breaks here.
describe('the SQL twins of the entity rules', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let transactions: KyselyTransactionRepository;
  let plans: KyselyInstallmentPlanRepository;
  let accountId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    transactions = new KyselyTransactionRepository(database.db);
    plans = new KyselyInstallmentPlanRepository(database.db);
    accountId = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('entersAccountsSql and inReviewSql agree with the entity on every combination', async () => {
    const category = await insertTestCategory(database.db);
    const natures = ['expense', 'income', 'transfer', 'balance_adjustment'] as const;
    let count = 0;

    for (const nature of natures) {
      for (const ignored of [false, true]) {
        for (const removed of [false, true]) {
          for (const origin of ['manual', 'bank'] as const) {
            for (const edited of [false, true]) {
              for (const categorized of [false, true]) {
                for (const divided of [false, true]) {
                  if (nature !== 'expense' && nature !== 'income' && categorized) continue;
                  if (origin === 'manual' && (removed || edited)) continue;
                  const amount = nature === 'income' ? 5000 : -5000;
                  const id = await insertTestTransaction(database.db, accountId, {
                    origin,
                    nature,
                    amount_cents: amount,
                    description: edited ? 'Editada' : 'ORIGINAL',
                    ignored_at: ignored ? '2026-11-06T12:00:00.000Z' : null,
                    bank_removed_at: removed ? '2026-11-06T12:00:00.000Z' : null,
                    category_id: categorized ? category : null,
                    category_source: categorized ? 'user' : null,
                    ...(origin === 'bank'
                      ? {
                          bank_description: 'ORIGINAL',
                          bank_amount_cents: amount,
                          bank_occurred_on: '2026-11-05',
                          bank_status: 'posted' as const,
                        }
                      : {}),
                  });
                  if (divided) {
                    await database.db
                      .insertInto('transaction_splits')
                      .values({
                        id: generateId(),
                        transaction_id: id,
                        position: 1,
                        amount_cents: amount,
                        nature: nature === 'income' ? 'income' : 'expense',
                        category_id: null,
                        description: null,
                      })
                      .execute();
                  }
                  count += 1;
                }
              }
            }
          }
        }
      }
    }

    const rows = await database.db
      .selectFrom('transactions as t')
      .select(['t.id', entersAccountsSql('t').as('enters'), inReviewSql('t').as('in_review')])
      .execute();
    const entities = new Map(
      (await transactions.findByIds(rows.map((row) => row.id))).map((entity) => [
        entity.id,
        entity,
      ]),
    );

    expect(rows).toHaveLength(count);
    expect(count).toBeGreaterThan(100);
    for (const row of rows) {
      const entity = entities.get(row.id);
      expect(Boolean(row.enters)).toBe(entity?.entersAccounts());
      expect(Boolean(row.in_review)).toBe(entity?.isInReview());
    }
  });

  it('competenceOnSql agrees with the entity for every purchase day and invoice month', async () => {
    const card = await insertTestCreditCard(database.db);
    const days = [
      '2026-01-29',
      '2026-01-30',
      '2026-01-31',
      '2026-10-31',
      '2026-12-31',
      '2028-02-29',
    ];
    const months = ['2026-02', '2026-04', '2026-11', '2027-02', '2028-02', '2028-04'];
    const ids: string[] = [];

    for (const purchaseOn of days) {
      const plan = await insertTestInstallmentPlan(database.db, card, {
        purchase_on: purchaseOn,
        total_cents: 600,
        installment_count: 6,
      });
      for (const [index, month] of months.entries()) {
        ids.push(
          await insertTestTransaction(database.db, card, {
            method: 'credit',
            // The date the bank gave has nothing to do with the competence of a parcel.
            occurred_on: purchaseOn,
            invoice_month: month,
            installment_plan_id: plan,
            installment_number: index + 1,
          }),
        );
      }
    }
    // And one that is not a parcel, whatever its invoice month.
    ids.push(
      await insertTestTransaction(database.db, card, {
        method: 'credit',
        occurred_on: '2026-03-15',
        invoice_month: '2026-04',
      }),
    );

    const rows = await database.db
      .selectFrom('transactions as t')
      .leftJoin('installment_plans as p', 'p.id', 't.installment_plan_id')
      .select(['t.id', competenceOnSql('t', 'p').as('competence')])
      .execute();
    const entities = await transactions.findByIds(ids);
    const planById = new Map(
      (
        await plans.findByIds([...new Set(entities.flatMap((e) => e.installment?.planId ?? []))])
      ).map((plan) => [plan.id, plan]),
    );

    expect(rows).toHaveLength(ids.length);
    for (const entity of entities) {
      const plan = entity.installment ? planById.get(entity.installment.planId) : undefined;
      const row = rows.find((candidate) => candidate.id === entity.id);

      expect(row?.competence).toBe(entity.competenceOn(plan?.purchaseOn ?? null).value);
    }
  });

  it('the standalone expression holds the day at the end of the month', async () => {
    const row = await sql<{ day: string }>`
      select min('2027-02' || '-' || substr('2026-10-31', 9, 2), date('2027-02' || '-01', '+1 month', '-1 day')) as day
    `.execute(database.db);

    expect(row.rows[0]?.day).toBe('2027-02-28');
  });
});
