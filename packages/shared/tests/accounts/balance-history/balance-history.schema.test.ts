import { describe, expect, it } from 'vitest';

import {
  balanceHistoryDtoSchema,
  balanceHistoryQuerySchema,
} from '#/accounts/balance-history/balance-history.schema.ts';

const id = '0194f3a0-0000-7000-8000-000000000001';

describe('balance history schemas', () => {
  it('needs the month in the query', () => {
    expect(balanceHistoryQuerySchema.safeParse({}).success).toBe(false);
    expect(balanceHistoryQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
  });

  it('has one point per day with integer cents', () => {
    const dto = {
      accountId: id,
      month: '2026-10',
      points: [{ date: '2026-10-01', balanceCents: 1000 }],
    };
    expect(balanceHistoryDtoSchema.safeParse(dto).success).toBe(true);
    expect(
      balanceHistoryDtoSchema.safeParse({
        ...dto,
        points: [{ date: '2026-10-01', balanceCents: 10.5 }],
      }).success,
    ).toBe(false);
  });
});
