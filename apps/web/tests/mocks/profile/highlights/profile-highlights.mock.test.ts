import { spendHeatmapDtoSchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { profileHighlightsDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function highlights() {
  const answer = await callApi('GET', '/profile/highlights');
  expect(answer.status).toBe(200);

  return profileHighlightsDtoSchema.parse(answer.json);
}

async function heatmap() {
  return spendHeatmapDtoSchema.parse((await callApi('GET', '/dashboard/spend-heatmap')).json);
}

describe('profile highlights route', () => {
  it('answers the six curiosities from the seed, all with data, and the same on every read', async () => {
    const dto = await highlights();

    expect(Object.values(dto).every((item) => item !== null)).toBe(true);
    expect(await highlights()).toEqual(dto);
  });

  it('finds the biggest Pix sent and received over the whole history, with the name or without it', async () => {
    const dto = await highlights();

    const sentCents = Math.max(
      ...db.transactions
        .filter((tx) => tx.method === 'pix' && tx.nature === 'expense' && !tx.ignoredAt)
        .map((tx) => Math.abs(tx.amountCents)),
    );
    const receivedCents = Math.max(
      ...db.transactions
        .filter((tx) => tx.method === 'pix' && tx.nature === 'income' && !tx.ignoredAt)
        .map((tx) => tx.amountCents),
    );
    expect(dto.largestPixSent?.amountCents).toBe(sentCents);
    expect(dto.largestPixReceived?.amountCents).toBe(receivedCents);
    const sent = db.transactions.find((tx) => tx.id === dto.largestPixSent?.transactionId);
    expect(sent?.method).toBe('pix');
    expect(sent?.occurredOn).toBe(dto.largestPixSent?.occurredOn);
    // The made-up statement text names the other side ("PIX JOSE C SILVA"); a transaction typed
    // by hand has no name, and then the field is null.
    expect(dto.largestPixReceived?.counterparty ?? null).not.toBe('');
  });

  it('has a null counterparty for a Pix with no name on the statement', async () => {
    for (const tx of db.transactions)
      if (tx.method === 'pix') Object.assign(tx, { origin: 'manual', bank: null });

    const dto = await highlights();

    expect(dto.largestPixSent?.counterparty).toBeNull();
    expect(dto.largestPixReceived?.counterparty).toBeNull();
  });

  it('does not count an ignored Pix', async () => {
    const before = await highlights();
    const biggest = db.transactions.find((tx) => tx.id === before.largestPixSent?.transactionId);
    if (!biggest) throw new Error('seed without a Pix sent');
    biggest.ignoredAt = '2026-10-01T12:00:00.000Z';

    const after = await highlights();

    expect(after.largestPixSent?.transactionId).not.toBe(biggest.id);
    expect(after.largestPixSent?.amountCents).toBeLessThanOrEqual(
      before.largestPixSent?.amountCents ?? 0,
    );
  });

  it('agrees with the spend heatmap on the month, the weekday and the streak', async () => {
    const dto = await highlights();
    const map = await heatmap();

    const byMonth = new Map<string, number>();
    for (const day of map.days)
      byMonth.set(day.date.slice(0, 7), (byMonth.get(day.date.slice(0, 7)) ?? 0) + day.totalCents);
    expect(dto.costliestMonth?.totalCents).toBe(Math.max(...byMonth.values()));
    expect(byMonth.get(dto.costliestMonth?.month ?? '')).toBe(dto.costliestMonth?.totalCents);
    expect((dto.costliestMonth?.month ?? '') >= addMonths(CURRENT_MONTH, -11)).toBe(true);

    let longest = 0;
    let run = 0;
    for (const day of map.days) {
      run = day.totalCents === 0 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(dto.longestNoSpendStreak?.days).toBe(longest);
    const { from, to } = dto.longestNoSpendStreak ?? { from: '', to: '' };
    const inside = map.days.filter((day) => day.date >= from && day.date <= to);
    expect(inside).toHaveLength(longest);
    expect(inside.every((day) => day.totalCents === 0)).toBe(true);

    const weekdayTotals = new Map<number, { total: number; count: number }>();
    for (const day of map.days) {
      const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay();
      const entry = weekdayTotals.get(weekday) ?? { total: 0, count: 0 };
      weekdayTotals.set(weekday, { total: entry.total + day.totalCents, count: entry.count + 1 });
    }
    const best = Math.max(...[...weekdayTotals.values()].map((e) => Math.round(e.total / e.count)));
    expect(dto.costliestWeekday?.averageCents).toBe(best);
  });

  it('names the category that spent the most, with its share of the spending', async () => {
    const dto = await highlights();
    const map = await heatmap();

    const category = db.categories.find((item) => item.id === dto.topCategory?.categoryId);
    expect(category?.kind).toBe('expense');
    expect(dto.topCategory?.totalCents).toBeLessThanOrEqual(map.totalCents);
    expect(dto.topCategory?.sharePercent).toBeGreaterThan(0);
    expect(dto.topCategory?.sharePercent).toBeLessThanOrEqual(100);
    expect(dto.topCategory?.sharePercent).toBeCloseTo(
      ((dto.topCategory?.totalCents ?? 0) / map.totalCents) * 100,
      0,
    );
  });

  it('answers 200 with every curiosity null when there is no history', async () => {
    db.transactions.length = 0;

    expect(await highlights()).toEqual({
      largestPixSent: null,
      largestPixReceived: null,
      topCategory: null,
      costliestMonth: null,
      costliestWeekday: null,
      longestNoSpendStreak: null,
    });
  });

  it('has no spending curiosity but keeps the Pix when only a Pix exists, outside the 12 months', async () => {
    const pix = db.transactions.find((tx) => tx.method === 'pix' && tx.nature === 'expense');
    if (!pix) throw new Error('seed without a Pix sent');
    db.transactions.splice(0, db.transactions.length, { ...pix, occurredOn: '2020-01-10' });

    const dto = await highlights();

    expect(dto.largestPixSent?.occurredOn).toBe('2020-01-10');
    expect(dto.largestPixReceived).toBeNull();
    expect(dto.topCategory).toBeNull();
    expect(dto.costliestMonth).toBeNull();
    expect(dto.costliestWeekday).toBeNull();
    expect(dto.longestNoSpendStreak).toBeNull();
  });
});
