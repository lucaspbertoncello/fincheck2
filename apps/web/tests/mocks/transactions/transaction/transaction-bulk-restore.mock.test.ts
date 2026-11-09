import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const MISSING = '0194f3a0-0000-7000-8000-999999999999';

function reviewExpense() {
  const tx = db.transactions.find(
    (item) => item.nature === 'expense' && item.categoryId === null && item.splits.length === 0,
  );
  if (!tx) throw new Error('seed without an expense to review');

  return tx;
}

function item(overrides: Record<string, unknown> = {}) {
  const tx = reviewExpense();

  return {
    transactionId: tx.id,
    categoryId: null,
    categorySource: null,
    categoryRuleId: null,
    tagIds: [],
    ignoredAt: null,
    ...overrides,
  };
}

async function restore(items: unknown[]) {
  return callApi('POST', '/transactions/bulk/restore', { items });
}

describe('bulk restore: what the body points to (mock vs api 37, 39)', () => {
  it('moves updatedAt to the instant of the undo', async () => {
    const tx = reviewExpense();
    const before = tx.updatedAt;

    const answer = await restore([item()]);

    expect(answer.status).toBe(200);
    expect(tx.updatedAt).not.toBe(before);
  });

  it('answers 404 for a category or a tag that does not exist', async () => {
    const category = db.categories.find((entry) => entry.kind === 'expense');
    const withCategory = await restore([item({ categoryId: MISSING, categorySource: 'user' })]);
    const withTag = await restore([item({ tagIds: [MISSING] })]);

    expect(apiErrorSchema.parse(withCategory.json).code).toBe('CATEGORY_NOT_FOUND');
    expect(withCategory.status).toBe(404);
    expect(apiErrorSchema.parse(withTag.json).code).toBe('TAG_NOT_FOUND');
    expect(category).toBeDefined();
  });

  it('answers 400 for a category without its origin, one of the other kind and an empty list', async () => {
    const expense = db.categories.find((entry) => entry.kind === 'expense')?.id;
    const income = db.categories.find((entry) => entry.kind === 'income')?.id;

    const withoutOrigin = await restore([item({ categoryId: expense, categorySource: null })]);
    const otherKind = await restore([item({ categoryId: income, categorySource: 'user' })]);
    const empty = await restore([]);

    expect([withoutOrigin.status, otherKind.status, empty.status]).toEqual([400, 400, 400]);
    expect(apiErrorSchema.parse(otherKind.json).code).toBe('VALIDATION_FAILED');
  });

  it('drops the saved category of a transaction that cannot hold one any more, and skips a gone one', async () => {
    const tx = reviewExpense();
    tx.nature = 'transfer';
    const expense = db.categories.find((entry) => entry.kind === 'expense')?.id;

    const answer = await restore([
      item({ categoryId: expense, categorySource: 'user' }),
      item({ transactionId: MISSING }),
    ]);

    expect(answer.json).toEqual({ restoredCount: 1 });
    expect(tx.categoryId).toBeNull();
  });
});
