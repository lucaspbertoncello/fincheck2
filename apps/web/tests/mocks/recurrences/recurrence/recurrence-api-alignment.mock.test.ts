import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import {
  createRecurrenceResponseSchema,
  recurrenceDtoSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const MISSING = '0194f3a0-0000-7000-8000-999999999999';
const NEXT_MONTH = addMonths(CURRENT_MONTH, 1);

// An expense that falls on the 28th: its window of this month is still open today (the 22nd).
const BASE_BODY = {
  kind: 'expense',
  name: 'Seguro do carro',
  expectedAmountCents: 10_000,
  dateRule: { type: 'fixed_day', day: 28 },
} as const;

async function createRecurrence(extra: Record<string, unknown> = {}) {
  const answer = await callApi('POST', '/recurrences', { ...BASE_BODY, ...extra });
  expect(answer.status).toBe(201);

  return createRecurrenceResponseSchema.parse(answer.json);
}

function occurrencesOf(recurrenceId: string): MockState.OccurrenceRecord[] {
  return db.occurrences
    .filter((item) => item.recurrenceId === recurrenceId)
    .sort((a, b) => a.month.localeCompare(b.month));
}

function addTransaction(overrides: Partial<MockState.TransactionRecord> = {}) {
  const account = db.accounts.find((item) => item.type !== 'credit_card' && !item.archivedAt);
  if (!account) throw new Error('No account');
  const tx = makeTransactionRecord({
    accountId: account.id,
    method: 'pix',
    description: 'PIX TESTE',
    amountCents: -10_000,
    occurredOn: TODAY,
  });
  Object.assign(tx, overrides);
  db.transactions.push(tx);

  return tx;
}

describe('recurrences routes (aligned with the api)', () => {
  it('refuses a month outside 2000 to 2100 in every route that takes one (59)', async () => {
    expect((await callApi('GET', '/recurrences?month=2101-01')).status).toBe(400);
    expect((await callApi('GET', '/recurrences/summary?month=1999-12')).status).toBe(400);
    expect((await callApi('GET', '/occurrences?month=2101-01')).status).toBe(400);
    expect(
      (
        await callApi('POST', '/recurrences/preview', {
          dateRule: { type: 'fixed_day', day: 15 },
          startsMonth: '2101-01',
        })
      ).status,
    ).toBe(400);
    expect(
      (await callApi('POST', '/recurrences', { ...BASE_BODY, startsMonth: '1999-12' })).status,
    ).toBe(400);
    const { recurrence } = await createRecurrence();
    expect(
      (await callApi('PATCH', `/recurrences/${recurrence.id}`, { startsMonth: '2101-01' })).status,
    ).toBe(400);
  });

  it('copies to the occurrences only the field that moved (60)', async () => {
    const { recurrence } = await createRecurrence({ startsMonth: CURRENT_MONTH });
    const next = occurrencesOf(recurrence.id).find((item) => item.month === NEXT_MONTH);
    if (!next) throw new Error('No occurrence next month');
    // The value of next month was edited by hand.
    expect(
      (await callApi('PATCH', `/occurrences/${next.id}`, { expectedAmountCents: 999 })).status,
    ).toBe(200);

    // The same amount comes in the body, only the day moved: the amount of the month stays.
    const moved = await callApi('PATCH', `/recurrences/${recurrence.id}`, {
      expectedAmountCents: 10_000,
      dateRule: { type: 'fixed_day', day: 20 },
    });
    expect(moved.status).toBe(200);
    expect(next.expectedAmountCents).toBe(999);
    expect(next.expectedOn).toBe(`${NEXT_MONTH}-20`);

    // The same day comes in the body, only the amount moved: the window of the month stays.
    next.windowEndOn = `${NEXT_MONTH}-29`;
    await callApi('PATCH', `/recurrences/${recurrence.id}`, {
      expectedAmountCents: 12_000,
      dateRule: { type: 'fixed_day', day: 20 },
    });
    expect(next.expectedAmountCents).toBe(12_000);
    expect(next.windowEndOn).toBe(`${NEXT_MONTH}-29`);
  });

  it('drops the untouched occurrences before a first month moved later, and creates the missing ones when it moves earlier (61)', async () => {
    const { recurrence } = await createRecurrence({ startsMonth: CURRENT_MONTH });
    const months = () => occurrencesOf(recurrence.id).map((item) => item.month);
    expect(months()).toEqual([
      CURRENT_MONTH,
      NEXT_MONTH,
      addMonths(CURRENT_MONTH, 2),
      addMonths(CURRENT_MONTH, 3),
    ]);

    // The next month got a payment: it stays, the untouched current month goes.
    const tx = addTransaction({ occurredOn: `${NEXT_MONTH}-02` });
    const next = occurrencesOf(recurrence.id)[1];
    expect(
      (await callApi('POST', `/occurrences/${next?.id}/payments`, { transactionId: tx.id })).status,
    ).toBe(201);
    const later = addMonths(CURRENT_MONTH, 2);
    await callApi('PATCH', `/recurrences/${recurrence.id}`, { startsMonth: later });
    expect(months()).toEqual([NEXT_MONTH, later, addMonths(CURRENT_MONTH, 3)]);

    // Moving it back creates the ones that are missing.
    await callApi('PATCH', `/recurrences/${recurrence.id}`, { startsMonth: CURRENT_MONTH });
    expect(months()).toEqual([CURRENT_MONTH, NEXT_MONTH, later, addMonths(CURRENT_MONTH, 3)]);
  });

  it('answers the errors of a new recurrence in the order of the api (62)', async () => {
    const category = db.categories.find((item) => item.kind === 'income');
    if (!category) throw new Error('No seed');
    const body = (extra: Record<string, unknown>) =>
      callApi('POST', '/recurrences', { ...BASE_BODY, ...extra });

    // A category of the wrong kind and an account that does not exist: the 404 comes first.
    const notFound = await body({ accountId: MISSING, categoryId: category.id });
    expect(notFound.status).toBe(404);
    expect(notFound.json).toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });

    // The regime and the category of the wrong kind: the regime comes first.
    const regime = await body({ employmentRegime: 'clt', categoryId: category.id });
    expect(regime.json).toMatchObject({ code: 'RECURRENCE_REGIME_ONLY_FOR_INCOME' });
    expect((await body({ categoryId: category.id })).json).toMatchObject({
      code: 'RECURRENCE_CATEGORY_KIND_MISMATCH',
    });

    // A transaction linked elsewhere and of the wrong kind: the 422 comes before the 409.
    const wrong = addTransaction({ amountCents: 5000, nature: 'income' });
    const taken = addTransaction();
    const { occurrence } = await createRecurrence({ startsMonth: CURRENT_MONTH });
    await callApi('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: taken.id });
    const wrongKind = await body({ linkTransactionId: wrong.id });
    expect(wrongKind.status).toBe(422);
    expect(wrongKind.json).toMatchObject({ code: 'OCCURRENCE_TRANSACTION_KIND_MISMATCH' });
    const linked = await body({ linkTransactionId: taken.id });
    expect(linked.status).toBe(409);
  });

  it('refuses a transaction that is a transfer, a payment of invoice, a debt, an adjustment or removed by the bank (63, 64)', async () => {
    const { occurrence } = await createRecurrence({ startsMonth: CURRENT_MONTH });
    const blocked = [
      addTransaction({ nature: 'transfer' }),
      addTransaction({ nature: 'invoice_payment' }),
      addTransaction({ nature: 'lent' }),
      addTransaction({ nature: 'balance_adjustment' }),
      addTransaction({ removedByBankAt: '2026-10-01T12:00:00.000Z' }),
      addTransaction({ ignoredAt: '2026-10-01T12:00:00.000Z' }),
    ];

    for (const tx of blocked) {
      const answer = await callApi('POST', `/occurrences/${occurrence?.id}/payments`, {
        transactionId: tx.id,
      });
      expect(answer.status).toBe(422);
      expect(answer.json).toMatchObject({ code: 'OCCURRENCE_TRANSACTION_KIND_MISMATCH' });
    }
    // The same rule when the recurrence is born from the transaction.
    for (const tx of blocked) {
      const answer = await callApi('POST', '/recurrences', {
        ...BASE_BODY,
        linkTransactionId: tx.id,
      });
      expect(answer.json).toMatchObject({ code: 'OCCURRENCE_TRANSACTION_KIND_MISMATCH' });
    }
  });

  it('refuses an archived account when creating and when moving to it, and keeps one that already lives there (77)', async () => {
    const [first, second] = db.accounts.filter((item) => item.type !== 'credit_card');
    if (!first || !second) throw new Error('No accounts');
    const { recurrence } = await createRecurrence({ accountId: first.id });
    first.archivedAt = '2026-10-01T12:00:00.000Z';

    const created = await callApi('POST', '/recurrences', { ...BASE_BODY, accountId: first.id });
    expect(created.status).toBe(422);
    expect(created.json).toMatchObject({ code: 'ACCOUNT_ARCHIVED' });
    second.archivedAt = '2026-10-01T12:00:00.000Z';
    const moved = await callApi('PATCH', `/recurrences/${recurrence.id}`, { accountId: second.id });
    expect(moved.json).toMatchObject({ code: 'ACCOUNT_ARCHIVED' });
    // It already lives in the archived one: other edits and the same account are fine.
    const renamed = await callApi('PATCH', `/recurrences/${recurrence.id}`, {
      name: 'Seguro novo',
      accountId: first.id,
    });
    expect(renamed.status).toBe(200);
    expect(recurrenceDtoSchema.parse(renamed.json).name).toBe('Seguro novo');
  });

  it('starts next month when the day of this month has passed, unless a month or a transaction says otherwise (80)', async () => {
    const passed = { dateRule: { type: 'fixed_day', day: 10 } };
    const late = await createRecurrence(passed);
    expect(late.recurrence.startsMonth).toBe(NEXT_MONTH);
    expect(late.occurrence).toBeNull();

    const open = await createRecurrence();
    expect(open.recurrence.startsMonth).toBe(CURRENT_MONTH);
    expect(open.occurrence?.month).toBe(CURRENT_MONTH);

    const chosen = await createRecurrence({ ...passed, startsMonth: CURRENT_MONTH });
    expect(chosen.recurrence.startsMonth).toBe(CURRENT_MONTH);

    const tx = addTransaction({ occurredOn: `${CURRENT_MONTH}-05` });
    const born = await createRecurrence({ ...passed, linkTransactionId: tx.id });
    expect(born.recurrence.startsMonth).toBe(CURRENT_MONTH);
  });

  it('brings late occurrences only from the 3 months before, of a recurrence that is not paused (79)', async () => {
    const { recurrence } = await createRecurrence({ startsMonth: addMonths(CURRENT_MONTH, -6) });
    const source = occurrencesOf(recurrence.id).at(0);
    if (!source) throw new Error('No occurrence');
    const old = (month: string): MockState.OccurrenceRecord => ({
      ...source,
      id: newId(),
      month,
      expectedOn: `${month}-10`,
      windowStartOn: `${month}-07`,
      windowEndOn: `${month}-13`,
      payments: [],
    });
    const inside = old(addMonths(CURRENT_MONTH, -3));
    const outside = old(addMonths(CURRENT_MONTH, -4));
    db.occurrences.push(inside, outside);
    const carried = async () =>
      listResponseSchema(occurrenceDtoSchema)
        .parse((await callApi('GET', `/occurrences?month=${CURRENT_MONTH}`)).json)
        .items.filter((item) => item.recurrenceId === recurrence.id && item.carriedOver);

    expect((await carried()).map((item) => item.month)).toEqual([inside.month]);

    await callApi('POST', `/recurrences/${recurrence.id}/pause`);
    expect(await carried()).toEqual([]);
  });

  it('shows an archived recurrence the occurrence whose only link is to an ignored transaction (84)', async () => {
    const { recurrence, occurrence } = await createRecurrence({ startsMonth: CURRENT_MONTH });
    const tx = addTransaction();
    await callApi('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: tx.id });
    // Ignoring the transaction: the link stays on record, and counts for nothing.
    tx.ignoredAt = '2026-10-21T12:00:00.000Z';
    await callApi('DELETE', `/recurrences/${recurrence.id}`);

    const items = listResponseSchema(occurrenceDtoSchema).parse(
      (await callApi('GET', `/occurrences?month=${CURRENT_MONTH}`)).json,
    ).items;
    const shown = items.find((item) => item.recurrenceId === recurrence.id);
    expect(shown?.payments).toEqual([]);
    expect(shown?.id).toBe(occurrence?.id);
  });
});
