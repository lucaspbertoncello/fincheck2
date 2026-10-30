import { describe, expect, it } from 'vitest';

import {
  createBillRequestSchema,
  listBillsQuerySchema,
  updateBillRequestSchema,
} from '#/bills/bill/bill.schema.ts';

const id = '0194f3a0-0000-7000-8000-000000000001';

describe('createBillRequestSchema', () => {
  const general = {
    direction: 'payable',
    kind: 'general',
    description: 'IPVA',
    amountCents: 38000,
    dueOn: '2026-11-05',
  };

  it('accepts a general bill without a counterparty', () => {
    expect(createBillRequestSchema.safeParse(general).success).toBe(true);
  });

  it('wants the person on a friend debt', () => {
    expect(createBillRequestSchema.safeParse({ ...general, kind: 'friend' }).success).toBe(false);
    expect(
      createBillRequestSchema.safeParse({ ...general, kind: 'friend', counterparty: 'Rafa' })
        .success,
    ).toBe(true);
  });

  it('does not take a category on what a friend owes me', () => {
    const owed = {
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      description: 'Jantar',
      amountCents: 11600,
    };
    expect(createBillRequestSchema.safeParse(owed).success).toBe(true);
    expect(createBillRequestSchema.safeParse({ ...owed, categoryId: id }).success).toBe(false);
  });

  it('wants the amount positive', () => {
    expect(createBillRequestSchema.safeParse({ ...general, amountCents: 0 }).success).toBe(false);
  });
});

describe('updateBillRequestSchema', () => {
  it('needs a field, is strict, and lets null clear the due date', () => {
    expect(updateBillRequestSchema.safeParse({}).success).toBe(false);
    expect(updateBillRequestSchema.safeParse({ direction: 'payable' }).success).toBe(false);
    expect(updateBillRequestSchema.safeParse({ dueOn: null }).success).toBe(true);
  });
});

describe('listBillsQuerySchema', () => {
  it('takes status open, settled or all', () => {
    expect(listBillsQuerySchema.safeParse({ status: 'all' }).success).toBe(true);
    expect(listBillsQuerySchema.safeParse({ status: 'overdue' }).success).toBe(false);
  });
});
