import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function breakdown(query: string) {
  const answer = await callApi('GET', `/dashboard/categories${query}`);
  expect(answer.status).toBe(200);

  return categoryBreakdownDtoSchema.parse(answer.json);
}

describe('GET /dashboard/categories', () => {
  it('reads a month as before: the month, the day it compares until, the expected income', async () => {
    const dto = await breakdown(`?month=${CURRENT_MONTH}`);

    expect(dto.month).toBe(CURRENT_MONTH);
    expect(dto.comparedUntilOn).not.toBeNull();
    expect(dto.expenses.previousTotalCents).not.toBeNull();
    expect(dto.incomes.expectedCents).toBeGreaterThan(0);
    expect(dto.incomes.items.some((item) => item.pending.length > 0)).toBe(true);
  });

  describe('a free period', () => {
    const PERIOD = '?from=2025-11-01&to=2026-10-31';

    it('has no month, compares until the end of the period and sums the whole range', async () => {
      const dto = await breakdown(PERIOD);
      const month = await breakdown(`?month=${CURRENT_MONTH}`);

      expect(dto.month).toBeNull();
      expect(dto.comparedUntilOn).toBe('2026-10-31');
      expect(dto.expenses.totalCents).toBeGreaterThan(month.expenses.totalCents);
      expect(dto.expenses.items.reduce((sum, item) => sum + item.spentCents, 0)).toBe(
        dto.expenses.totalCents,
      );
    });

    it('compares with the period of the same size right before', async () => {
      // September and October 2026 are 61 days; the 61 days before them run from 2 July to 31 August.
      const dto = await breakdown('?from=2026-09-01&to=2026-10-31');
      const before = await breakdown('?from=2026-07-02&to=2026-08-31');

      expect(dto.expenses.previousTotalCents).toBe(before.expenses.totalCents);
      for (const item of dto.expenses.items) {
        expect(item.changeCents).toBe(item.spentCents - (item.previousSpentCents ?? 0));
      }
    });

    it('has no expected income from the recurrences: expected is what came in, nothing pending', async () => {
      const dto = await breakdown(PERIOD);

      expect(dto.incomes.expectedCents).toBe(dto.incomes.receivedCents);
      expect(dto.incomes.items.every((item) => item.pending.length === 0)).toBe(true);
    });
  });

  describe('all the history (no month, no range)', () => {
    it('has no comparison at all: null fields and no "where it grew the most"', async () => {
      const dto = await breakdown('');

      expect(dto.month).toBeNull();
      expect(dto.comparedUntilOn).toBeNull();
      expect(dto.expenses.previousTotalCents).toBeNull();
      expect(dto.expenses.topGrowth).toBeNull();
      expect(dto.expenses.totalCents).toBeGreaterThan(0);
      for (const item of dto.expenses.items) {
        expect(item.previousSpentCents).toBeNull();
        expect(item.changeCents).toBeNull();
        expect(item.changePct).toBeNull();
      }
    });

    it('sums at least as much as any period inside it', async () => {
      const all = await breakdown('');
      const year = await breakdown('?from=2026-01-01&to=2026-12-31');

      expect(all.expenses.totalCents).toBeGreaterThanOrEqual(year.expenses.totalCents);
    });
  });

  it('refuses one end alone, from after to, and a month next to a range', async () => {
    expect((await callApi('GET', '/dashboard/categories?from=2026-01-01')).status).toBe(400);
    expect(
      (await callApi('GET', '/dashboard/categories?from=2026-02-01&to=2026-01-31')).status,
    ).toBe(400);
    expect(
      (
        await callApi(
          'GET',
          `/dashboard/categories?month=${CURRENT_MONTH}&from=2026-10-01&to=2026-10-31`,
        )
      ).status,
    ).toBe(400);
  });
});
