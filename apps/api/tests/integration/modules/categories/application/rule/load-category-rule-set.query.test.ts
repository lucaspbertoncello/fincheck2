import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';
import { LoadCategoryRuleSetQuery } from '#/modules/categories/application/rule/load-category-rule-set.query.ts';
import { GetTagRefsQuery } from '#/modules/categories/application/tag/get-tag-refs.query.ts';
import { KyselyCategoryRuleRepository } from '#/modules/categories/infra/rule/category-rule.repository.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const AT = '2026-11-01T00:00:00.000Z';

describe('LoadCategoryRuleSetQuery with a category that is a transfer', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;

  beforeEach(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.destroy();
  });

  async function ruleSetFor(categoryId: string) {
    await database.db
      .insertInto('category_rules')
      .values({
        id: 'rule-1',
        description_contains: 'pix',
        counterparty_contains: null,
        kind: null,
        account_id: null,
        amount_min_cents: null,
        amount_max_cents: null,
        category_id: categoryId,
        enabled: 1,
        created_at: AT,
        updated_at: AT,
      })
      .execute();

    return new LoadCategoryRuleSetQuery(
      database.db,
      new KyselyCategoryRuleRepository(database.db),
      new GetCategoryRefsQuery(database.db),
      new GetTagRefsQuery(database.db),
    ).execute();
  }

  const candidate = (nature: 'expense' | 'income') => ({
    description: 'pix para itau',
    bankDescription: null,
    counterparty: null,
    accountId: 'account-1',
    nature,
    amountCents: nature === 'expense' ? -100 : 100,
  });

  it('resolves it for an expense and for an income (both legs of a rotation)', async () => {
    const rotation = await insertTestCategory(database.db, { name: 'Giro', is_transfer: 1 });
    const ruleSet = await ruleSetFor(rotation);

    expect(ruleSet.resolve(candidate('expense'))?.category?.id).toBe(rotation);
    expect(ruleSet.resolve(candidate('income'))?.category?.id).toBe(rotation);
  });

  it('keeps an ordinary category to its own kind', async () => {
    const food = await insertTestCategory(database.db, { name: 'Feira' });
    const ruleSet = await ruleSetFor(food);

    expect(ruleSet.resolve(candidate('expense'))?.category?.id).toBe(food);
    expect(ruleSet.resolve(candidate('income'))).toBeNull();
  });
});
