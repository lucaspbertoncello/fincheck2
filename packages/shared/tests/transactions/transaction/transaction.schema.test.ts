import { describe, expect, it } from 'vitest';

import {
  createTransactionRequestSchema,
  listTransactionsQuerySchema,
  resolveBankChangeRequestSchema,
  splitTransactionRequestSchema,
  transactionBankChangeDtoSchema,
  updateTransactionRequestSchema,
} from '#/transactions/transaction/transaction.schema.ts';

const id = '0194f3a0-0000-7000-8000-000000000001';
const id2 = '0194f3a0-0000-7000-8000-000000000002';

describe('createTransactionRequestSchema', () => {
  const valid = {
    type: 'expense',
    accountId: id,
    method: 'pix',
    description: 'Padaria',
    amountCents: 1850,
    occurredOn: '2026-10-22',
  };

  it('accepts a manual expense', () => {
    expect(createTransactionRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('wants the amount positive (the sign comes from the type)', () => {
    expect(createTransactionRequestSchema.safeParse({ ...valid, amountCents: -1850 }).success).toBe(
      false,
    );
    expect(createTransactionRequestSchema.safeParse({ ...valid, amountCents: 0 }).success).toBe(
      false,
    );
    expect(createTransactionRequestSchema.safeParse({ ...valid, amountCents: 18.5 }).success).toBe(
      false,
    );
  });

  it('refuses a type outside expense and income', () => {
    expect(createTransactionRequestSchema.safeParse({ ...valid, type: 'transfer' }).success).toBe(
      false,
    );
  });

  it('trims the description and keeps it between 1 and 200 characters', () => {
    expect(createTransactionRequestSchema.safeParse({ ...valid, description: '  ' }).success).toBe(
      false,
    );
    expect(
      createTransactionRequestSchema.safeParse({ ...valid, description: 'x'.repeat(201) }).success,
    ).toBe(false);
  });

  it('refuses a date that does not exist and repeated tags', () => {
    expect(
      createTransactionRequestSchema.safeParse({ ...valid, occurredOn: '2026-02-31' }).success,
    ).toBe(false);
    expect(createTransactionRequestSchema.safeParse({ ...valid, tagIds: [id, id] }).success).toBe(
      false,
    );
  });
});

describe('updateTransactionRequestSchema', () => {
  it('needs at least one field and is strict', () => {
    expect(updateTransactionRequestSchema.safeParse({}).success).toBe(false);
    expect(updateTransactionRequestSchema.safeParse({ accountId: id }).success).toBe(false);
  });

  it('lets null clear the category', () => {
    expect(updateTransactionRequestSchema.safeParse({ categoryId: null }).success).toBe(true);
  });

  it('only changes the nature among expense, income and transfer', () => {
    expect(updateTransactionRequestSchema.safeParse({ nature: 'transfer' }).success).toBe(true);
    expect(updateTransactionRequestSchema.safeParse({ nature: 'lent' }).success).toBe(false);
  });
});

describe('listTransactionsQuerySchema', () => {
  it('does not combine month with a cursor or a limit', () => {
    expect(listTransactionsQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(listTransactionsQuerySchema.safeParse({ month: '2026-10', limit: '10' }).success).toBe(
      false,
    );
    expect(listTransactionsQuerySchema.safeParse({ month: '2026-10', cursor: 'x' }).success).toBe(
      false,
    );
  });

  it('does not combine categoryId with uncategorized', () => {
    expect(
      listTransactionsQuerySchema.safeParse({ categoryId: id, uncategorized: 'true' }).success,
    ).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ uncategorized: 'true' }).success).toBe(true);
  });

  it('keeps the limit up to 500 and the search up to 100 characters', () => {
    expect(listTransactionsQuerySchema.safeParse({ limit: '501' }).success).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ search: 'x'.repeat(101) }).success).toBe(false);
  });
});

describe('splitTransactionRequestSchema', () => {
  const part = { amountCents: 5000, categoryId: id };

  it('needs exactly two positive parts', () => {
    expect(splitTransactionRequestSchema.safeParse({ parts: [part, part] }).success).toBe(true);
    expect(splitTransactionRequestSchema.safeParse({ parts: [part] }).success).toBe(false);
    expect(splitTransactionRequestSchema.safeParse({ parts: [part, part, part] }).success).toBe(
      false,
    );
    expect(
      splitTransactionRequestSchema.safeParse({ parts: [part, { ...part, amountCents: 0 }] })
        .success,
    ).toBe(false);
  });
});

describe('bank change', () => {
  it('needs at least one change, with the type that fits the field', () => {
    const detectedAt = '2026-10-22T13:05:00.000Z';
    expect(transactionBankChangeDtoSchema.safeParse({ detectedAt, changes: [] }).success).toBe(
      false,
    );
    expect(
      transactionBankChangeDtoSchema.safeParse({
        detectedAt,
        changes: [{ field: 'amountCents', before: -5280, after: -4680 }],
      }).success,
    ).toBe(true);
    expect(
      transactionBankChangeDtoSchema.safeParse({
        detectedAt,
        changes: [{ field: 'amountCents', before: '52,80', after: '46,80' }],
      }).success,
    ).toBe(false);
  });

  it('resolves with bank or mine only', () => {
    expect(resolveBankChangeRequestSchema.safeParse({ use: 'bank' }).success).toBe(true);
    expect(resolveBankChangeRequestSchema.safeParse({ use: 'both' }).success).toBe(false);
  });
});

describe('ids', () => {
  it('are UUIDs', () => {
    expect(
      updateTransactionRequestSchema.safeParse({ transferCounterpartId: 'not-a-uuid' }).success,
    ).toBe(false);
    expect(updateTransactionRequestSchema.safeParse({ transferCounterpartId: id2 }).success).toBe(
      true,
    );
  });
});
