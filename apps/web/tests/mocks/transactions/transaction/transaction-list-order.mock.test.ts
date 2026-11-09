import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listTransactionsResponseSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function page(query: string) {
  return listTransactionsResponseSchema.parse(
    (await callApi('GET', `/transactions?${query}`)).json,
  );
}

describe('transactions list: order and cursor (mock vs api 4 and 5)', () => {
  it('orders a month by competence first, then by day, newest first', async () => {
    const { items } = await page(`month=${CURRENT_MONTH}`);
    const keys = items.map((tx) => `${tx.competenceOn}|${tx.occurredOn}`);

    expect(keys).toEqual([...keys].sort((a, b) => b.localeCompare(a)));
    // An installment counts on the day of the purchase in the month of its invoice, so it can sit
    // above a transaction that happened later.
    const installment = items.find((tx) => tx.installment !== null);
    expect(installment).toBeDefined();
    const later = items.filter(
      (tx) =>
        installment &&
        tx.occurredOn > installment.occurredOn &&
        tx.competenceOn < installment.competenceOn,
    );
    const rows = items.map((tx) => tx.id);
    for (const tx of later)
      expect(rows.indexOf(tx.id)).toBeGreaterThan(rows.indexOf(installment?.id ?? ''));
  });

  it('hands out an opaque cursor that is the key of the last row, and pages without a gap', async () => {
    const first = await page('limit=10');
    expect(first.nextCursor).not.toBeNull();
    expect(first.nextCursor).not.toMatch(/^\d+$/);
    const second = await page(`limit=10&cursor=${first.nextCursor}`);
    const ids = [...first.items, ...second.items].map((tx) => tx.id);

    expect(new Set(ids).size).toBe(20);
    const all = await page('limit=20');
    expect(ids).toEqual(all.items.map((tx) => tx.id));
  });

  it('refuses a cursor the mock did not emit', async () => {
    for (const cursor of ['abc', btoa('10'), btoa('["a","b"]')]) {
      const answer = await callApi('GET', `/transactions?cursor=${encodeURIComponent(cursor)}`);

      expect(answer.status).toBe(400);
      expect(apiErrorSchema.parse(answer.json).code).toBe('VALIDATION_FAILED');
    }
  });
});
