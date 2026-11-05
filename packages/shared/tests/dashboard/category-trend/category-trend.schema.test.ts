import { describe, expect, it } from 'vitest';

import {
  categoryTrendDtoSchema,
  categoryTrendQuerySchema,
} from '#/dashboard/category-trend/category-trend.schema.ts';

const month = (index: number) => `2026-${String(index).padStart(2, '0')}`;
const twelveMonths = Array.from({ length: 12 }, (_, index) => ({
  month: month(index + 1),
  totalCents: index * 1000,
  transactionCount: index,
}));

describe('categoryTrendQuerySchema', () => {
  it('takes a month as `until`, or nothing', () => {
    expect(categoryTrendQuerySchema.safeParse({ until: '2026-10' }).success).toBe(true);
    expect(categoryTrendQuerySchema.safeParse({}).success).toBe(true);
  });

  it('refuses an `until` that is not a month', () => {
    expect(categoryTrendQuerySchema.safeParse({ until: '2026-13' }).success).toBe(false);
    expect(categoryTrendQuerySchema.safeParse({ until: '2026-10-01' }).success).toBe(false);
  });
});

describe('categoryTrendDtoSchema', () => {
  const dto = {
    categoryId: '0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b',
    kind: 'expense',
    months: twelveMonths,
  };

  it('takes exactly 12 months with a total and a count each', () => {
    expect(categoryTrendDtoSchema.safeParse(dto).success).toBe(true);
    expect(
      categoryTrendDtoSchema.safeParse({ ...dto, months: twelveMonths.slice(1) }).success,
    ).toBe(false);
  });

  it('refuses a kind that is not expense or income, and a negative count', () => {
    expect(categoryTrendDtoSchema.safeParse({ ...dto, kind: 'transfer' }).success).toBe(false);
    expect(
      categoryTrendDtoSchema.safeParse({
        ...dto,
        months: [
          { month: '2026-01', totalCents: 0, transactionCount: -1 },
          ...twelveMonths.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
});
