import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';
import { LoadCategoryRuleSetQuery } from '#/modules/categories/application/rule/load-category-rule-set.query.ts';
import { GetTagRefsQuery } from '#/modules/categories/application/tag/get-tag-refs.query.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import { KyselyCategoryRuleRepository } from '#/modules/categories/infra/rule/category-rule.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

const NOW = '2026-11-06T12:00:00.000Z';

const CANDIDATE: CategoryRule.Candidate = {
  description: 'Uber *Trip',
  bankDescription: null,
  counterparty: null,
  nature: 'expense',
  accountId: 'account-1',
  amountCents: -2000,
};

// What the import applies to the new transactions: a transaction only gets the tags of the category
// that came out, and with no category it gets no tag (PM, 09/11/2026).
describe('LoadCategoryRuleSetQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: LoadCategoryRuleSetQuery;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new LoadCategoryRuleSetQuery(
      database.db,
      new KyselyCategoryRuleRepository(database.db),
      new GetCategoryRefsQuery(database.db),
      new GetTagRefsQuery(database.db),
    );
  });

  afterEach(async () => {
    await database.destroy();
  });

  const insertRule = async (
    text: string,
    categoryId: string | null,
    tagIds: string[],
    createdAt: string,
  ) => {
    const id = generateId();
    await database.db
      .insertInto('category_rules')
      .values({
        id,
        description_contains: text,
        counterparty_contains: null,
        kind: null,
        account_id: null,
        amount_min_cents: null,
        amount_max_cents: null,
        category_id: categoryId,
        enabled: 1,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .execute();
    if (tagIds.length > 0) {
      await database.db
        .insertInto('category_rule_tags')
        .values(tagIds.map((tagId) => ({ rule_id: id, tag_id: tagId })))
        .execute();
    }

    return id;
  };

  it('gives the tags of the category that came out and drops the ones of another rule category', async () => {
    const transport = await insertTestCategory(database.db);
    const fun = await insertTestCategory(database.db);
    const transportTag = await insertTestTag(database.db, { category_id: transport });
    const funTag = await insertTestTag(database.db, { category_id: fun });
    const oldest = await insertRule('UBER', transport, [transportTag], '2026-11-01T00:00:00.000Z');
    await insertRule('TRIP', fun, [funTag], '2026-11-02T00:00:00.000Z');

    const resolution = (await query.execute()).resolve(CANDIDATE);

    expect(resolution).toMatchObject({ ruleId: oldest, category: { id: transport } });
    expect(resolution?.tagIds).toEqual([transportTag]);
  });

  it('adds up the tags of every matching rule of the same category, and drops an archived tag', async () => {
    const transport = await insertTestCategory(database.db);
    const tagA = await insertTestTag(database.db, { category_id: transport });
    const tagB = await insertTestTag(database.db, { category_id: transport });
    const old = await insertTestTag(database.db, {
      category_id: transport,
      archived_at: NOW,
    });
    await insertRule('UBER', transport, [tagA, old], '2026-11-01T00:00:00.000Z');
    await insertRule('TRIP', transport, [tagB], '2026-11-02T00:00:00.000Z');

    const resolution = (await query.execute()).resolve(CANDIDATE);

    expect([...(resolution?.tagIds ?? [])].sort()).toEqual([tagA, tagB].sort());
  });

  it('resolves nothing when no rule gives a category: a tag has no category to belong to', async () => {
    const transport = await insertTestCategory(database.db);
    const tag = await insertTestTag(database.db, { category_id: transport });
    // A legacy rule with tags and no category cannot be created any more, but the data may hold one.
    await insertRule('UBER', null, [tag], '2026-11-01T00:00:00.000Z');

    expect((await query.execute()).resolve(CANDIDATE)).toBeNull();
  });
});
