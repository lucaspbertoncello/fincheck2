import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { addTransaction } from '#tests/mocks/dashboard/support/add-transaction.util.ts';
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

    it('has no expected income (a period has no expectation): nothing expected, nothing pending', async () => {
      const dto = await breakdown(PERIOD);

      expect(dto.incomes.receivedCents).toBeGreaterThan(0);
      expect(dto.incomes.expectedCents).toBe(0);
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

  describe('against the API', () => {
    it('has an item only for a category with spending in the period, not for one that spent only before', async () => {
      const month = await breakdown(`?month=${CURRENT_MONTH}`);
      const spentNow = new Set(month.expenses.items.map((item) => item.categoryId));
      const category = db.categories.find(
        (item) => item.kind === 'expense' && !item.archivedAt && !spentNow.has(item.id),
      );
      if (!category) throw new Error('seed without an idle expense category');
      addTransaction({
        nature: 'expense',
        amountCents: 4000,
        occurredOn: dateInMonth(addMonths(CURRENT_MONTH, -1), 2),
        categoryId: category.id,
      });

      const dto = await breakdown(`?month=${CURRENT_MONTH}`);

      expect(dto.expenses.items.some((item) => item.categoryId === category.id)).toBe(false);
      expect(dto.expenses.items.every((item) => item.transactionCount > 0)).toBe(true);
    });

    it('tests "where it grew the most" on the cents: 9,995 % is not 10 %', async () => {
      const category = db.categories.find((item) => item.kind === 'expense' && !item.archivedAt)!;
      const before = addTransaction({
        nature: 'expense',
        amountCents: 22_000,
        occurredOn: dateInMonth(addMonths(CURRENT_MONTH, -1), 1),
        categoryId: category.id,
      });
      const now = addTransaction({
        nature: 'expense',
        amountCents: 24_199,
        occurredOn: TODAY,
        categoryId: category.id,
      });
      // Only these two are left: the category is the one of both.
      db.transactions = db.transactions.filter((tx) => tx.id === before.id || tx.id === now.id);

      const below = await breakdown(`?month=${CURRENT_MONTH}`);
      expect(below.expenses.items[0]?.changePct).toBe(10);
      expect(below.expenses.topGrowth).toBeNull();

      now.amountCents = -24_200;
      const exact = await breakdown(`?month=${CURRENT_MONTH}`);
      expect(exact.expenses.topGrowth).toMatchObject({
        categoryId: category.id,
        changeCents: 2200,
      });
    });

    it('keeps the sign of a category whose refund was bigger than its spending, with a share of 0', async () => {
      const month = await breakdown(`?month=${CURRENT_MONTH}`);
      const category = db.categories.find(
        (item) =>
          item.kind === 'expense' &&
          !item.archivedAt &&
          !month.expenses.items.some((entry) => entry.categoryId === item.id),
      )!;
      const refund = addTransaction({
        nature: 'expense',
        amountCents: 1000,
        occurredOn: TODAY,
        categoryId: category.id,
      });
      refund.amountCents = 1000;

      const dto = await breakdown(`?month=${CURRENT_MONTH}`);
      const item = dto.expenses.items.find((entry) => entry.categoryId === category.id);

      expect(item).toMatchObject({ spentCents: -1000, sharePct: 0 });
    });

    it('sums the expected income of the month the way the summary does', async () => {
      const dto = await breakdown(`?month=${CURRENT_MONTH}`);
      const summary = (await callApi('GET', `/dashboard/month-summary?month=${CURRENT_MONTH}`))
        .json as { income: { expectedCents: number } };

      expect(dto.incomes.expectedCents).toBe(summary.income.expectedCents);
    });
  });
});
