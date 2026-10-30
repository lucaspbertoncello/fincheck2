import { describe, expect, it } from 'vitest';

import {
  bulkTransactionsRequestSchema,
  restoreBulkRequestSchema,
} from '#/transactions/transaction-bulk/transaction-bulk.schema.ts';

const id = (n: number) => `0194f3a0-0000-7000-8000-${String(n).padStart(12, '0')}`;

describe('bulkTransactionsRequestSchema', () => {
  it('accepts each of the three actions', () => {
    for (const action of [
      { type: 'categorize', categoryId: id(9) },
      { type: 'addTag', tagId: id(9) },
      { type: 'ignore' },
    ]) {
      expect(
        bulkTransactionsRequestSchema.safeParse({ transactionIds: [id(1)], action }).success,
      ).toBe(true);
    }
  });

  it('refuses an action without its id and an unknown action', () => {
    expect(
      bulkTransactionsRequestSchema.safeParse({
        transactionIds: [id(1)],
        action: { type: 'categorize' },
      }).success,
    ).toBe(false);
    expect(
      bulkTransactionsRequestSchema.safeParse({
        transactionIds: [id(1)],
        action: { type: 'delete' },
      }).success,
    ).toBe(false);
  });

  it('wants 1 to 500 ids with no repeat', () => {
    const action = { type: 'ignore' };
    expect(bulkTransactionsRequestSchema.safeParse({ transactionIds: [], action }).success).toBe(
      false,
    );
    expect(
      bulkTransactionsRequestSchema.safeParse({ transactionIds: [id(1), id(1)], action }).success,
    ).toBe(false);
    const many = Array.from({ length: 501 }, (_, index) => id(index + 1));
    expect(bulkTransactionsRequestSchema.safeParse({ transactionIds: many, action }).success).toBe(
      false,
    );
  });
});

describe('restoreBulkRequestSchema', () => {
  const previous = {
    transactionId: id(1),
    categoryId: null,
    categorySource: null,
    categoryRuleId: null,
    tagIds: [],
    ignoredAt: null,
  };

  it('takes back exactly what the action returned', () => {
    expect(restoreBulkRequestSchema.safeParse({ items: [previous] }).success).toBe(true);
    expect(restoreBulkRequestSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      restoreBulkRequestSchema.safeParse({ items: [{ ...previous, categorySource: 'robot' }] })
        .success,
    ).toBe(false);
  });
});
