import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

// The tags of a transaction are the ones of its category (PM, 09/11/2026): the mock answers the way
// the API does, so `dev:mocks` keeps working.
const expenseCategories = () =>
  db.categories.filter((item) => item.kind === 'expense' && !item.archivedAt);

function addTag(categoryId: string, name: string, archivedAt: string | null = null): string {
  const id = `0194f3a0-0000-7000-8000-${String(db.tags.length + 500).padStart(12, '0')}`;
  db.tags.push({ id, categoryId, name, archivedAt });

  return id;
}

function newExpense(extra: Record<string, unknown> = {}) {
  const account = db.accounts.find((item) => item.type === 'checking');

  return callApi('POST', '/transactions', {
    type: 'expense',
    accountId: account?.id,
    method: 'pix',
    description: 'Teste de tags',
    amountCents: 1000,
    occurredOn: '2026-10-20',
    ...extra,
  });
}

const codeOf = (answer: { json: unknown }) => apiErrorSchema.parse(answer.json).code;
const idOf = (answer: { json: unknown }) => (answer.json as { id: string }).id;

describe('tags of a transaction (mock)', () => {
  it('takes the tags of its category on create, and refuses another category or none (422)', async () => {
    const [food, fun] = expenseCategories();
    const foodTag = addTag(food?.id ?? '', 'feira');
    const funTag = addTag(fun?.id ?? '', 'cinema');

    const ok = await newExpense({ categoryId: food?.id, tagIds: [foodTag] });
    const other = await newExpense({ categoryId: food?.id, tagIds: [funTag] });
    const none = await newExpense({ tagIds: [foodTag] });

    expect(ok.status).toBe(201);
    expect(ok.json).toMatchObject({ tagIds: [foodTag] });
    expect([other.status, none.status]).toEqual([422, 422]);
    expect(codeOf(other)).toBe('TRANSACTION_TAG_CATEGORY_MISMATCH');
    expect(codeOf(none)).toBe('TRANSACTION_TAG_NEEDS_CATEGORY');
  });

  it('takes the tags of the old category off when the category changes, in the same request', async () => {
    const [food, fun] = expenseCategories();
    const foodTag = addTag(food?.id ?? '', 'feira');
    const funTag = addTag(fun?.id ?? '', 'cinema');
    const id = idOf(await newExpense({ categoryId: food?.id, tagIds: [foodTag] }));

    const moved = await callApi('PATCH', `/transactions/${id}`, { categoryId: fun?.id });
    expect(moved.json).toMatchObject({ categoryId: fun?.id, tagIds: [] });

    const withTag = await callApi('PATCH', `/transactions/${id}`, {
      categoryId: food?.id,
      tagIds: [foodTag],
    });
    expect(withTag.json).toMatchObject({ categoryId: food?.id, tagIds: [foodTag] });

    const mismatch = await callApi('PATCH', `/transactions/${id}`, {
      categoryId: fun?.id,
      tagIds: [foodTag],
    });
    expect(codeOf(mismatch)).toBe('TRANSACTION_TAG_CATEGORY_MISMATCH');
    expect(funTag).toBeDefined();
  });

  it('keeps the tags when the same category is sent again, and drops them when it is cleared', async () => {
    const [food] = expenseCategories();
    const tag = addTag(food?.id ?? '', 'feira');
    const id = idOf(await newExpense({ categoryId: food?.id, tagIds: [tag] }));

    const same = await callApi('PATCH', `/transactions/${id}`, { categoryId: food?.id });
    const cleared = await callApi('PATCH', `/transactions/${id}`, { categoryId: null });

    expect(same.json).toMatchObject({ tagIds: [tag] });
    expect(cleared.json).toMatchObject({ categoryId: null, tagIds: [] });
  });

  it('lets an archived tag the transaction already has stay, and refuses a new archived one', async () => {
    const [food] = expenseCategories();
    const old = addTag(food?.id ?? '', 'velha');
    const archived = addTag(food?.id ?? '', 'arquivada', '2026-01-01T00:00:00.000Z');
    const id = idOf(await newExpense({ categoryId: food?.id, tagIds: [old] }));
    const found = db.tags.find((item) => item.id === old);
    if (found) found.archivedAt = '2026-01-01T00:00:00.000Z';

    const kept = await callApi('PATCH', `/transactions/${id}`, { tagIds: [old] });
    const added = await callApi('PATCH', `/transactions/${id}`, { tagIds: [old, archived] });

    expect(kept.status).toBe(200);
    expect(codeOf(added)).toBe('TRANSACTION_TAG_ARCHIVED');
  });

  it('bulk "Tag" skips, with its own reason, the transactions of another category or with none', async () => {
    const [food, fun] = expenseCategories();
    const tag = addTag(food?.id ?? '', 'feira');
    const fits = idOf(await newExpense({ categoryId: food?.id }));
    const other = idOf(await newExpense({ categoryId: fun?.id }));
    const none = idOf(await newExpense());

    const answer = await callApi('POST', '/transactions/bulk', {
      transactionIds: [fits, other, none],
      action: { type: 'addTag', tagId: tag },
    });

    expect(answer.json).toMatchObject({
      updatedCount: 1,
      skipped: [
        { transactionId: other, reason: 'tag_category_mismatch' },
        { transactionId: none, reason: 'tag_category_mismatch' },
      ],
    });
  });

  it('drops the tags in any flow that takes the category away, not only the edit', async () => {
    const [food] = expenseCategories();
    const tag = addTag(food?.id ?? '', 'feira');
    const id = idOf(await newExpense({ categoryId: food?.id, tagIds: [tag] }));
    const record = db.transactions.find((item) => item.id === id);
    if (!record) throw new Error('missing');

    // A flow outside the edit (a link, a bill, an invoice) clears the category...
    record.categoryId = null;
    // ...and the next write of any route settles the tags with it.
    await callApi('PATCH', `/transactions/${id}`, { description: 'Outra' });

    expect(record.tagIds).toEqual([]);
  });

  it('refuses a restore whose tags are not of its category (400)', async () => {
    const [food, fun] = expenseCategories();
    const funTag = addTag(fun?.id ?? '', 'cinema');
    const id = idOf(await newExpense());

    const answer = await callApi('POST', '/transactions/bulk/restore', {
      items: [
        {
          transactionId: id,
          categoryId: food?.id,
          categorySource: 'user',
          categoryRuleId: null,
          tagIds: [funTag],
          ignoredAt: null,
        },
      ],
    });

    expect(answer.status).toBe(400);
  });

  describe('aligned with the API', () => {
    it('bulk "Tag" takes a split transaction when a part has the category of the tag', async () => {
      const [food, fun] = expenseCategories();
      const tag = addTag(fun?.id ?? '', 'cinema');
      const id = idOf(await newExpense({ categoryId: food?.id }));
      await callApi('PUT', `/transactions/${id}/splits`, {
        parts: [
          { amountCents: 400, categoryId: food?.id },
          { amountCents: 600, categoryId: fun?.id },
        ],
      });

      const answer = await callApi('POST', '/transactions/bulk', {
        transactionIds: [id],
        action: { type: 'addTag', tagId: tag },
      });

      expect(answer.json).toMatchObject({ updatedCount: 1, skipped: [] });
      expect(db.transactions.find((item) => item.id === id)?.tagIds).toEqual([tag]);
    });

    it('undoes "Ignorar" on a split transaction and on a transfer by category without losing tags', async () => {
      const [food, fun] = expenseCategories();
      const rotation = db.categories.find((item) => item.isTransfer);
      const foodTag = addTag(food?.id ?? '', 'feira');
      const rotationTag = addTag(rotation?.id ?? '', 'conta');
      const split = idOf(await newExpense({ categoryId: food?.id, tagIds: [foodTag] }));
      await callApi('PUT', `/transactions/${split}/splits`, {
        parts: [
          { amountCents: 400, categoryId: food?.id },
          { amountCents: 600, categoryId: fun?.id },
        ],
      });
      const transfer = idOf(await newExpense({ categoryId: rotation?.id, tagIds: [rotationTag] }));

      const bulk = await callApi('POST', '/transactions/bulk', {
        transactionIds: [split, transfer],
        action: { type: 'ignore' },
      });
      const restored = await callApi('POST', '/transactions/bulk/restore', {
        items: (bulk.json as { previous: unknown[] }).previous,
      });

      expect(restored.status).toBe(200);
      expect(db.transactions.find((item) => item.id === split)?.tagIds).toEqual([foodTag]);
      expect(db.transactions.find((item) => item.id === transfer)).toMatchObject({
        categoryId: rotation?.id,
        tagIds: [rotationTag],
      });
    });

    it('linking the other leg of a transfer by category keeps its category and tags', async () => {
      const rotation = db.categories.find((item) => item.isTransfer);
      const tag = addTag(rotation?.id ?? '', 'conta');
      const id = idOf(await newExpense());
      await callApi('PATCH', `/transactions/${id}`, { categoryId: rotation?.id, tagIds: [tag] });

      const answer = await callApi('PATCH', `/transactions/${id}`, {
        nature: 'transfer',
        tagIds: [tag],
      });

      expect(answer.json).toMatchObject({ categoryId: rotation?.id, tagIds: [tag] });
    });
  });

  describe('a split transaction: the tags of the categories of its parts', () => {
    it('keeps the tags a part kept, drops the others, takes tags of any part and goes back with none', async () => {
      const [food, fun, third] = expenseCategories();
      const foodTag = addTag(food?.id ?? '', 'feira');
      const funTag = addTag(fun?.id ?? '', 'cinema');
      const thirdTag = addTag(third?.id ?? '', 'outra');
      const id = idOf(await newExpense({ categoryId: food?.id, tagIds: [foodTag] }));
      const part = (amountCents: number, categoryId: string | undefined) => ({
        amountCents,
        categoryId,
      });

      const split = await callApi('PUT', `/transactions/${id}/splits`, {
        parts: [part(400, food?.id), part(600, fun?.id)],
      });
      expect(split.status).toBe(200);
      expect(split.json).toMatchObject({ tagIds: [foodTag] });

      const both = await callApi('PATCH', `/transactions/${id}`, { tagIds: [foodTag, funTag] });
      expect(both.json).toMatchObject({ tagIds: [foodTag, funTag] });
      const outside = await callApi('PATCH', `/transactions/${id}`, { tagIds: [thirdTag] });
      expect(codeOf(outside)).toBe('TRANSACTION_TAG_CATEGORY_MISMATCH');

      const redone = await callApi('PUT', `/transactions/${id}/splits`, {
        parts: [part(400, fun?.id), part(600, fun?.id)],
      });
      expect(redone.json).toMatchObject({ tagIds: [funTag] });

      const whole = await callApi('DELETE', `/transactions/${id}/splits`);
      expect(whole.json).toMatchObject({ categoryId: null, tagIds: [] });
    });
  });
});
