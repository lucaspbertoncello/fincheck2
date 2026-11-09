import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { describe, expect, it } from 'vitest';

import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { addTransaction } from '#tests/mocks/dashboard/support/add-transaction.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function summary(month: string) {
  const answer = await callApi('GET', `/dashboard/month-summary?month=${month}`);
  expect(answer.status).toBe(200);

  return monthSummaryDtoSchema.parse(answer.json);
}

describe('GET /dashboard/month-summary against the API', () => {
  it('never shows more received than expected', async () => {
    const dto = await summary(CURRENT_MONTH);

    expect(dto.income.receivedCents).toBeLessThanOrEqual(dto.income.expectedCents);
    expect(dto.income.receivedPct ?? 0).toBeLessThanOrEqual(100);
  });

  it('adds the income that no occurrence took in to what was received and to what was expected', async () => {
    const before = await summary(CURRENT_MONTH);
    addTransaction({ nature: 'income', amountCents: 12_300, occurredOn: TODAY });

    const after = await summary(CURRENT_MONTH);

    expect(after.income.receivedCents - before.income.receivedCents).toBe(12_300);
    expect(after.income.expectedCents - before.income.expectedCents).toBe(12_300);
  });

  it('compares a past month as a whole against the whole month before', async () => {
    const month = addMonths(CURRENT_MONTH, -1);
    const dto = await summary(month);

    expect(dto.isCurrentMonth).toBe(false);
    expect(dto.asOfOn).toBe(dateInMonth(month, 31));
    expect(dto.expenses.comparedUntilOn).toBe(dateInMonth(month, 31));
    expect(dto.expenses.previousComparedUntilOn).toBe(dateInMonth(addMonths(month, -1), 31));
  });

  it('compares a month of 31 days against the whole of a shorter one', async () => {
    const dto = await summary('2026-03');

    expect(dto.expenses.comparedUntilOn).toBe('2026-03-31');
    expect(dto.expenses.previousComparedUntilOn).toBe('2026-02-28');
  });
});
