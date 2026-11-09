import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function timeline(scope: 'all' | 'recurrences') {
  const answer = await callApi('GET', `/dashboard/timeline?month=${CURRENT_MONTH}&scope=${scope}`);
  expect(answer.status).toBe(200);

  return timelineDtoSchema.parse(answer.json);
}

describe('GET /dashboard/timeline against the API', () => {
  it('does not list what a friend owes Lucas in "all": it does not move the accounts', async () => {
    const dto = await timeline('all');
    const friend = db.bills.find(
      (bill) => bill.kind === 'friend' && bill.direction === 'receivable',
    );
    if (!friend) throw new Error('seed without a friend who owes');
    const everyItem = [...dto.days.flatMap((day) => day.items), ...dto.overdue, ...dto.undated];

    expect(everyItem.some((item) => item.key === `bill:${friend.id}`)).toBe(false);
  });

  it('keeps a late occurrence on its own day in "recurrences"; only one from an earlier month goes to the chips', async () => {
    const template = db.occurrences.find((item) => item.month === CURRENT_MONTH);
    if (!template) throw new Error('seed without an occurrence');
    // Late and of this month: its window is over, its day is still in the month.
    template.expectedOn = `${CURRENT_MONTH}-01`;
    template.windowStartOn = `${CURRENT_MONTH}-01`;
    template.windowEndOn = `${CURRENT_MONTH}-01`;
    template.settledAt = null;
    template.skippedAt = null;
    template.payments = [];

    const dto = await timeline('recurrences');
    const placed = dto.days
      .flatMap((day) => day.items)
      .find((item) => item.source.occurrenceId === template.id);

    expect(placed).toMatchObject({ date: `${CURRENT_MONTH}-01` });
    expect(dto.overdue.some((item) => item.source.occurrenceId === template.id)).toBe(false);
    for (const item of dto.overdue) {
      const record = db.occurrences.find((entry) => entry.id === item.source.occurrenceId);
      expect((record?.month ?? CURRENT_MONTH) < CURRENT_MONTH).toBe(true);
    }
  });

  it('ends the current month on the Livre', async () => {
    const dto = await timeline('all');
    const free = (await callApi('GET', '/dashboard/free-balance')).json as {
      freeBalanceCents: number;
    };

    expect(dto.endBalanceCents).toBe(free.freeBalanceCents);
    expect(dto.days.at(-1)?.projectedBalanceCents).toBe(free.freeBalanceCents);
  });
});
