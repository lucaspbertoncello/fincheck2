import { describe, expect, it } from 'vitest';

import { backupStatsDtoSchema } from '#/backup/backup-stats/backup-stats.schema.ts';

const valid = {
  dbSizeBytes: 2_560_000,
  transactionCount: 812,
  accountCount: 5,
  firstTransactionOn: '2025-11-03',
};

describe('backupStatsDtoSchema', () => {
  it('accepts the four numbers of the Dados page', () => {
    expect(backupStatsDtoSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a database with no transaction yet', () => {
    const empty = { ...valid, transactionCount: 0, firstTransactionOn: null };
    expect(backupStatsDtoSchema.safeParse(empty).success).toBe(true);
  });

  it('refuses a negative or fractional count and a date that is not a business date', () => {
    expect(backupStatsDtoSchema.safeParse({ ...valid, dbSizeBytes: -1 }).success).toBe(false);
    expect(backupStatsDtoSchema.safeParse({ ...valid, accountCount: 2.5 }).success).toBe(false);
    expect(
      backupStatsDtoSchema.safeParse({ ...valid, firstTransactionOn: '2025-02-30' }).success,
    ).toBe(false);
    expect(
      backupStatsDtoSchema.safeParse({ ...valid, firstTransactionOn: '2025-11-03T10:00:00Z' })
        .success,
    ).toBe(false);
  });
});
