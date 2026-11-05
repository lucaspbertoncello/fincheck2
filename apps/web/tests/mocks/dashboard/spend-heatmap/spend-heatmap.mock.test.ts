import { spendHeatmapDtoSchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { describe, expect, it } from 'vitest';

import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { daysBetween } from '#mocks/support/dates/days-between.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function heatmap(query = '') {
  return spendHeatmapDtoSchema.parse(
    (await callApi('GET', `/dashboard/spend-heatmap${query}`)).json,
  );
}

describe('spend heatmap route', () => {
  it('covers 12 whole calendar months up to today, one item per day with no gaps', async () => {
    const map = await heatmap();

    expect(map.untilOn).toBe(TODAY);
    expect(map.fromOn).toBe(`${addMonths(CURRENT_MONTH, -11)}-01`);
    expect(map.days).toHaveLength(daysBetween(map.fromOn, map.untilOn) + 1);
    expect(map.days[0]?.date).toBe(map.fromOn);
    expect(map.days.at(-1)?.date).toBe(map.untilOn);
    map.days.forEach((day, index) => {
      if (index > 0) expect(daysBetween(map.days[index - 1]?.date ?? '', day.date)).toBe(1);
    });
  });

  it('has a past to show: spending in most of the 12 months, with a peak', async () => {
    const map = await heatmap();
    const months = new Set(
      map.days.filter((day) => day.totalCents > 0).map((day) => day.date.slice(0, 7)),
    );

    expect(months.size).toBeGreaterThanOrEqual(11);
    expect(map.spendingDays).toBeGreaterThan(80);
    expect(map.totalCents).toBe(map.days.reduce((sum, day) => sum + day.totalCents, 0));
    expect(map.peak?.totalCents).toBe(Math.max(...map.days.map((day) => day.totalCents)));
  });

  it('gives level 0 to a day with no spending and levels 1 to 4 by the ranges', async () => {
    const map = await heatmap();

    expect(map.levels).toHaveLength(4);
    for (const day of map.days) {
      if (day.totalCents === 0) expect(day.level).toBe(0);
      else {
        const range = map.levels.find((item) => item.level === day.level);
        expect(range && day.totalCents >= range.minCents).toBe(true);
        expect(range?.maxCents == null || day.totalCents <= range.maxCents).toBe(true);
      }
    }
    expect(new Set(map.days.map((day) => day.level))).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('is the same on every read (nothing random)', async () => {
    expect(await heatmap()).toEqual(await heatmap());
  });

  it('follows the transactions: a new expense raises that day', async () => {
    const before = await heatmap();
    const day = before.days.find((item) => item.totalCents === 0 && item.date < TODAY);
    const accounts = (await callApi('GET', '/accounts')).json as { items: { id: string }[] };
    await callApi('POST', '/transactions', {
      type: 'expense',
      accountId: accounts.items[0]?.id,
      method: 'pix',
      description: 'PIX TESTE MAPA',
      amountCents: 12_345,
      occurredOn: day?.date,
    });

    const after = await heatmap();
    expect(after.days.find((item) => item.date === day?.date)?.totalCents).toBe(12_345);
    expect(after.totalCents).toBe(before.totalCents + 12_345);
  });

  it('takes until: a shorter map for an earlier day, and refuses a bad date', async () => {
    const until = `${addMonths(CURRENT_MONTH, -3)}-15`;
    const map = await heatmap(`?until=${until}`);

    expect(map.untilOn).toBe(until);
    expect(map.fromOn).toBe(`${addMonths(CURRENT_MONTH, -14)}-01`);
    expect((await callApi('GET', '/dashboard/spend-heatmap?until=2026-13-40')).status).toBe(400);
  });

  describe('a month or a year asked as from and to', () => {
    const year = CURRENT_MONTH.slice(0, 4);

    it('answers a whole month, one item per day, with the levels of that month', async () => {
      const month = addMonths(CURRENT_MONTH, -1);
      const map = await heatmap(`?from=${month}-01&to=${month}-30`);

      expect(map.fromOn).toBe(`${month}-01`);
      expect(map.untilOn).toBe(`${month}-30`);
      expect(map.days.map((day) => day.date.slice(0, 7))).toEqual(Array(30).fill(month));
      expect(map.days).toHaveLength(30);
      expect(map.totalCents).toBe(map.days.reduce((sum, day) => sum + day.totalCents, 0));
      expect(map.spendingDays).toBeGreaterThan(0);
    });

    it('answers a whole year from 1 January to 31 December, one item per day', async () => {
      const map = await heatmap(`?from=${year}-01-01&to=${year}-12-31`);

      expect(map.fromOn).toBe(`${year}-01-01`);
      expect(map.untilOn).toBe(`${year}-12-31`);
      expect(map.days).toHaveLength(daysBetween(map.fromOn, map.untilOn) + 1);
      expect(map.days.some((day) => day.date > TODAY)).toBe(true);
      expect(map.totalCents).toBe(map.days.reduce((sum, day) => sum + day.totalCents, 0));
    });

    it('scales the intensity to the period asked: a quiet month still has its four levels', async () => {
      const month = addMonths(CURRENT_MONTH, -2);
      const monthMap = await heatmap(`?from=${month}-01&to=${month}-28`);
      const yearMap = await heatmap();

      expect(monthMap.levels).toHaveLength(4);
      expect(monthMap.levels).not.toEqual(yearMap.levels);
      const used = new Set(monthMap.days.map((day) => day.level));
      expect([...used].filter((level) => level > 0).length).toBeGreaterThanOrEqual(3);
      expect(Math.max(...monthMap.days.map((day) => day.level))).toBe(4);
    });

    it('gives an empty period no levels and every day at level 0', async () => {
      const map = await heatmap('?from=2001-03-01&to=2001-03-31');

      expect(map.levels).toEqual([]);
      expect(map.spendingDays).toBe(0);
      expect(map.peak).toBeNull();
      expect(map.days.every((day) => day.level === 0)).toBe(true);
    });

    it('refuses a bad range: only one end, backwards, over 366 days, or mixed with until', async () => {
      expect((await callApi('GET', '/dashboard/spend-heatmap?from=2026-10-01')).status).toBe(400);
      expect(
        (await callApi('GET', '/dashboard/spend-heatmap?from=2026-10-31&to=2026-10-01')).status,
      ).toBe(400);
      expect(
        (await callApi('GET', '/dashboard/spend-heatmap?from=2026-01-01&to=2027-01-02')).status,
      ).toBe(400);
      expect(
        (
          await callApi(
            'GET',
            '/dashboard/spend-heatmap?until=2026-10-31&from=2026-10-01&to=2026-10-31',
          )
        ).status,
      ).toBe(400);
    });
  });
});
