import { createRecurrenceResponseSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { listSubscriptionsResponseSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { afterEach, describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { restoreTestClock, setTestClock } from '#tests/support/clock/set-test-clock.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import {
  addTestCardCharge,
  findTestCard,
} from '#tests/support/recurrences/subscription/add-test-card-charge.util.ts';

resetDatabaseBeforeEach();

async function readSubscriptions(month = CURRENT_MONTH): Promise<Subscription.ListResponse> {
  return listSubscriptionsResponseSchema.parse(
    (await callApi('GET', `/subscriptions?month=${month}`)).json,
  );
}

const suggestionOf = (data: Subscription.ListResponse, text: string) =>
  data.suggestions.find((item) => item.description.includes(text));

// A monthly charge of a description on the card, on the 5th of each month back from this one.
function addMonthlyCharges(description: string, months: number, day = '05'): void {
  for (let step = 0; step < months; step += 1) {
    addTestCardCharge(description, `${addMonths(CURRENT_MONTH, -step)}-${day}`, 5000);
  }
}

async function createSubscription(matchText: string, name = 'Assinatura teste') {
  const answer = await callApi('POST', '/recurrences', {
    kind: 'expense',
    name,
    expectedAmountCents: 5000,
    accountId: findTestCard().id,
    method: 'credit',
    matchText,
    isSubscription: true,
    dateRule: { type: 'fixed_day', day: 28 },
    startsMonth: addMonths(CURRENT_MONTH, -24),
  });
  expect(answer.status).toBe(201);

  return createRecurrenceResponseSchema.parse(answer.json).recurrence;
}

describe('subscriptions routes (suggestions, aligned with the api)', () => {
  it('groups a description with the installment number that changes every month (67)', async () => {
    addTestCardCharge('SERVICOX 01/12', `${addMonths(CURRENT_MONTH, -2)}-05`, 5000);
    addTestCardCharge('SERVICOX 02/12', `${addMonths(CURRENT_MONTH, -1)}-05`, 5000);
    addTestCardCharge('SERVICOX 03/12', `${CURRENT_MONTH}-05`, 5000);

    const found = suggestionOf(await readSubscriptions(), 'SERVICOX');
    expect(found).toMatchObject({ monthsSeen: 3, description: 'SERVICOX 03/12' });
    expect(found?.key.startsWith('SERVICOX|')).toBe(true);
  });

  it('measures "up to 5 days" on the circle of the month: the 30th and the 2nd are 3 days apart (68)', async () => {
    addTestCardCharge('REVISTAX', `${addMonths(CURRENT_MONTH, -1)}-30`, 3000);
    addTestCardCharge('REVISTAX', `${CURRENT_MONTH}-02`, 3000);
    addTestCardCharge('JORNALX', `${addMonths(CURRENT_MONTH, -1)}-10`, 3000);
    addTestCardCharge('JORNALX', `${CURRENT_MONTH}-20`, 3000);

    const data = await readSubscriptions();
    expect(suggestionOf(data, 'REVISTAX')?.monthsSeen).toBe(2);
    expect(suggestionOf(data, 'JORNALX')).toBeUndefined();
  });

  it('reads 12 months back, so a run counts at most 13 months (69)', async () => {
    addMonthlyCharges('CLUBEX', 16);

    expect(suggestionOf(await readSubscriptions(), 'CLUBEX')?.monthsSeen).toBe(13);
  });

  it('leaves out what was lent or moved on the card (85)', async () => {
    for (const nature of ['lent', 'transfer', 'reimbursed'] as const) {
      const name = `COISA${nature.toUpperCase()}`;
      addTestCardCharge(name, `${addMonths(CURRENT_MONTH, -1)}-05`, 5000).nature = nature;
      addTestCardCharge(name, `${CURRENT_MONTH}-05`, 5000).nature = nature;
    }
    addMonthlyCharges('CONTAX', 2);

    const data = await readSubscriptions();
    expect(data.suggestions.some((item) => item.description.startsWith('COISA'))).toBe(false);
    expect(suggestionOf(data, 'CONTAX')).toBeDefined();
  });

  it('proposes the name and the match text without the "n/N" and the "*", and takes the service from the shared list (88, 73, 86)', async () => {
    addTestCardCharge('GOOGLE *YOUTUBEMUSIC 02/12', `${addMonths(CURRENT_MONTH, -1)}-05`, 2190);
    addTestCardCharge('GOOGLE *YOUTUBEMUSIC 03/12', `${CURRENT_MONTH}-05`, 2190);
    addTestCardCharge('ANTHROPIC', `${addMonths(CURRENT_MONTH, -1)}-06`, 10_000);
    addTestCardCharge('ANTHROPIC', `${CURRENT_MONTH}-06`, 10_000);
    const data = await readSubscriptions();
    const music = suggestionOf(data, 'YOUTUBEMUSIC');
    const claude = suggestionOf(data, 'ANTHROPIC');

    const music1 = createRecurrenceResponseSchema.parse(
      (await callApi('POST', '/subscriptions/suggestions/accept', { key: music?.key })).json,
    ).recurrence;
    expect(music1).toMatchObject({
      name: 'Google Youtubemusic',
      matchText: 'GOOGLE *YOUTUBEMUSIC',
      serviceSlug: 'youtubemusic',
    });
    const anthropic = createRecurrenceResponseSchema.parse(
      (await callApi('POST', '/subscriptions/suggestions/accept', { key: claude?.key })).json,
    ).recurrence;
    expect(anthropic.serviceSlug).toBe('claude');
  });

  it('takes "Outro" when the body says so and the service it sends when it names one (73)', async () => {
    addMonthlyCharges('ANTHROPIC', 2);
    const key = suggestionOf(await readSubscriptions(), 'ANTHROPIC')?.key;
    const accepted = await callApi('POST', '/subscriptions/suggestions/accept', {
      key,
      serviceSlug: null,
    });

    expect(createRecurrenceResponseSchema.parse(accepted.json).recurrence.serviceSlug).toBeNull();
  });

  it('opens the past months expecting what was charged in them, ties the charges as the user and moves them off a deleted recurrence (70, 71, 72)', async () => {
    const prices = [4000, 4500, 5000];
    prices.forEach((cents, index) => {
      addTestCardCharge('PLAYTUDO', `${addMonths(CURRENT_MONTH, index - 2)}-05`, cents);
    });
    const suggest = async () => suggestionOf(await readSubscriptions(), 'PLAYTUDO')?.key;
    const accept = async () =>
      createRecurrenceResponseSchema.parse(
        (await callApi('POST', '/subscriptions/suggestions/accept', { key: await suggest() })).json,
      ).recurrence;

    const first = await accept();
    const own = db.occurrences
      .filter((item) => item.recurrenceId === first.id)
      .sort((a, b) => a.month.localeCompare(b.month));
    const [older, middle, current] = own;
    expect(older).toMatchObject({ expectedAmountCents: 4000 });
    expect(middle).toMatchObject({ expectedAmountCents: 4500 });
    expect(current).toMatchObject({ expectedAmountCents: 5000 });
    expect(
      own.flatMap((item) => item.payments).every((payment) => payment.linkedBy === 'user'),
    ).toBe(true);

    // Deleted: the suggestion is back, and accepting it again takes the charges over.
    expect((await callApi('DELETE', `/recurrences/${first.id}`)).status).toBe(204);
    const second = await accept();
    expect(second.id).not.toBe(first.id);
    const held = db.occurrences.filter((item) => item.recurrenceId === first.id);
    expect(held.flatMap((item) => item.payments)).toEqual([]);
    expect(
      db.occurrences
        .filter((item) => item.recurrenceId === second.id)
        .flatMap((item) => item.payments),
    ).toHaveLength(3);
  });

  it('answers "Agora não" twice with the same 204 (74)', async () => {
    addMonthlyCharges('CONTAY', 2);
    const key = suggestionOf(await readSubscriptions(), 'CONTAY')?.key;

    expect((await callApi('POST', '/subscriptions/suggestions/dismiss', { key })).status).toBe(204);
    expect((await callApi('POST', '/subscriptions/suggestions/dismiss', { key })).status).toBe(204);
    expect(db.subscriptionDismissals.filter((item) => item === key)).toHaveLength(1);
    expect(
      (await callApi('POST', '/subscriptions/suggestions/dismiss', { key: 'NADA|x' })).status,
    ).toBe(404);
  });
});

describe('subscriptions routes (the charges of one, aligned with the api)', () => {
  it('reads the charges of a subscription 13 months back from the month asked (75)', async () => {
    await createSubscription('ASSINAX');
    addTestCardCharge('ASSINAX', `${addMonths(CURRENT_MONTH, -14)}-05`, 5000);
    const far = (await readSubscriptions()).items.find(
      (item) => item.recurrence.matchText === 'ASSINAX',
    );
    expect(far?.lastChargeCents).toBeNull();

    addTestCardCharge('ASSINAX', `${addMonths(CURRENT_MONTH, -13)}-05`, 5000);
    const near = (await readSubscriptions()).items.find(
      (item) => item.recurrence.matchText === 'ASSINAX',
    );
    expect(near?.lastChargeCents).toBe(5000);
  });

  it('finds the text as a whole word: "Max" is not in "MAXXY" (82)', async () => {
    await createSubscription('MAX');
    addTestCardCharge('MAXXY ACADEMIA', `${CURRENT_MONTH}-05`, 5000);
    const find = async () =>
      (await readSubscriptions()).items.find((item) => item.recurrence.matchText === 'MAX');
    expect((await find())?.lastChargeCents).toBeNull();

    addTestCardCharge('MAX *STREAMING', `${CURRENT_MONTH}-06`, 5000);
    expect((await find())?.lastChargeCents).toBe(5000);
  });
});

describe('subscriptions routes (the day it ended)', () => {
  afterEach(() => {
    restoreTestClock();
  });

  it('counts the day it was paused in São Paulo, not the day in UTC (66)', async () => {
    // 22:30 on the 22nd in São Paulo is already the 23rd in UTC.
    setTestClock(new Date('2026-10-23T01:30:00.000Z'));
    const netflix = (await readSubscriptions()).items.find(
      (item) => item.recurrence.name === 'Netflix',
    );
    if (!netflix) throw new Error('No Netflix');
    await callApi('POST', `/recurrences/${netflix.recurrence.id}/pause`);
    const card = db.recurrences.find((item) => item.id === netflix.recurrence.id)?.accountId;

    // A charge on the 23rd came after it ended on the 22nd.
    addTestCardCharge('NETFLIX.COM', '2026-10-23', 4490, card ?? undefined);
    const after = (await readSubscriptions()).items.find(
      (item) => item.recurrence.id === netflix.recurrence.id,
    );
    expect(after?.alert).toMatchObject({ kind: 'charged_after_end', occurredOn: '2026-10-23' });
  });
});
