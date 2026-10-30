import { spendHeatmapDtoSchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { describe, expect, it } from 'vitest';

import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/clock.constant.ts';
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
});
