import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  createRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceListItemSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { listSubscriptionsResponseSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import {
  addTestCardCharge,
  findTestCard,
} from '#tests/support/recurrences/subscription/add-test-card-charge.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function readSubscriptions(month = CURRENT_MONTH): Promise<Subscription.ListResponse> {
  return listSubscriptionsResponseSchema.parse(
    (await callApi('GET', `/subscriptions?month=${month}`)).json,
  );
}

function itemNamed(data: Subscription.ListResponse, name: string): Subscription.Item {
  const item = data.items.find((candidate) => candidate.recurrence.name === name);
  if (!item) throw new Error(`No subscription named ${name}`);

  return item;
}

// Today in the tests is 2026-10-22. The seed charges on days that follow today, so the cases below
// place their own purchases on fixed days of the last months.
const SEPTEMBER = '2026-09';
const AUGUST = '2026-08';

describe('GET /subscriptions (items and summary)', () => {
  it('lists the expense recurrences paid on the card, by charge day, and nothing else', async () => {
    const data = await readSubscriptions();
    const names = data.items.map((item) => item.recurrence.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'Netflix',
        'Plano celular',
        'Spotify',
        'Nuvem+ 200 GB',
        'Treina Cursos',
        'Revista Digital',
      ]),
    );
    // Academia is a debit expense and the salaries are income: not subscriptions.
    expect(names).not.toContain('Academia');
    expect(names).not.toContain('Mesada');
    expect(data.items.every((item) => item.recurrence.method === 'credit')).toBe(true);
    // The ended one comes after the active ones.
    expect(names.at(-1)).toBe('Revista Digital');
    const activeDays = data.items.slice(0, -1).map((item) => item.chargeDay);
    expect(activeDays).toEqual([...activeDays].sort((a, b) => a - b));
  });

  it('marks charged, to charge and did not charge', async () => {
    const data = await readSubscriptions();

    expect(itemNamed(data, 'Netflix')).toMatchObject({ status: 'charged', alert: null });
    expect(itemNamed(data, 'Plano celular')).toMatchObject({ status: 'upcoming', alert: null });
    expect(itemNamed(data, 'Nuvem+ 200 GB')).toMatchObject({
      status: 'missed',
      alert: { kind: 'missed' },
    });
    expect(itemNamed(data, 'Netflix').lastChargeCents).toBe(4490);
  });

  it('warns that the price changed with the amounts before and after', async () => {
    const musicando = itemNamed(await readSubscriptions(), 'Spotify');

    expect(musicando.status).toBe('charged');
    expect(musicando.alert).toEqual({ kind: 'price_changed', fromCents: 2190, toCents: 2490 });
    expect(musicando.lastChargeCents).toBe(2490);
  });

  it('does not warn when the price moved by R$ 0,50 or less', async () => {
    const before = itemNamed(await readSubscriptions(), 'Treina Cursos');
    expect(before.alert).toBeNull();
    const recurrence = db.recurrences.find((item) => item.name === 'Treina Cursos');
    if (!recurrence) throw new Error('No Treina Cursos');

    // The expected amount is 50 cents below what was charged: still no warning.
    recurrence.expectedAmountCents = 7850;
    expect(itemNamed(await readSubscriptions(), 'Treina Cursos').alert).toBeNull();
    // One cent more is already a change.
    recurrence.expectedAmountCents = 7849;
    expect(itemNamed(await readSubscriptions(), 'Treina Cursos').alert).toEqual({
      kind: 'price_changed',
      fromCents: 7849,
      toCents: 7900,
    });
  });

  it('shows an ended subscription only because it charged after it ended', async () => {
    const data = await readSubscriptions();
    const revista = itemNamed(data, 'Revista Digital');

    expect(revista.recurrence.pausedAt).not.toBeNull();
    expect(revista.alert).toMatchObject({ kind: 'charged_after_end', amountCents: 3490 });
    expect(revista.alert?.kind === 'charged_after_end' && revista.alert.transactionId).toBeTruthy();

    // In a month with no charge after the end it is not listed at all.
    const august = await readSubscriptions(AUGUST);
    expect(august.items.map((item) => item.recurrence.name)).not.toContain('Revista Digital');
  });

  it('sums only the active ones, and the year is the month times 12', async () => {
    const data = await readSubscriptions();
    const active = data.items.filter((item) => item.recurrence.pausedAt === null);
    const monthly = active.reduce((sum, item) => sum + item.recurrence.expectedAmountCents, 0);

    expect(data.summary.activeCount).toBe(active.length);
    expect(data.summary.activeCount).toBe(5);
    expect(data.summary.monthlyTotalCents).toBe(monthly);
    expect(data.summary.yearlyTotalCents).toBe(monthly * 12);
  });

  it('follows the other lists: pausing a subscription takes it out of the tab and the total', async () => {
    const before = await readSubscriptions();
    const streamflix = itemNamed(before, 'Netflix');

    expect((await callApi('POST', `/recurrences/${streamflix.recurrence.id}/pause`)).status).toBe(
      200,
    );
    const after = await readSubscriptions();

    expect(after.items.map((item) => item.recurrence.name)).not.toContain('Netflix');
    expect(after.summary.activeCount).toBe(before.summary.activeCount - 1);
    expect(after.summary.monthlyTotalCents).toBe(before.summary.monthlyTotalCents - 4490);
  });

  it('updating the expected amount to the last charge clears the price warning', async () => {
    const musicando = itemNamed(await readSubscriptions(), 'Spotify');

    const updated = await callApi('PATCH', `/recurrences/${musicando.recurrence.id}`, {
      expectedAmountCents: 2490,
    });
    expect(updated.status).toBe(200);

    expect(itemNamed(await readSubscriptions(), 'Spotify').alert).toBeNull();
  });
});

describe('GET /subscriptions (suggestions)', () => {
  const seeded = (data: Subscription.ListResponse, text: string) =>
    data.suggestions.find((item) => item.description.includes(text));

  it('suggests what came back on the card without a recurrence, with the last charge', async () => {
    const data = await readSubscriptions();
    const podcast = seeded(data, 'DEEZER PREMIUM');
    const leitura = seeded(data, 'LEITURA MENSAL');

    expect(podcast).toMatchObject({ lastAmountCents: 1990, monthsSeen: 3 });
    expect(podcast?.transactionIds).toHaveLength(3);
    expect(leitura).toMatchObject({ lastAmountCents: 3290, monthsSeen: 2 });
    expect(podcast?.accountId).toBe(findTestCard().id);
    // What a recurrence already covers is never suggested.
    expect(seeded(data, 'NETFLIX')).toBeUndefined();
    expect(seeded(data, 'SPOTIFY')).toBeUndefined();
    expect(seeded(data, 'REVISTA DIGITAL')).toBeUndefined();
  });

  it('accepts a difference of up to 15% and refuses more', async () => {
    // Measured on the last amount (10.000): 15% is 1.500 apart.
    addTestCardCharge('SERVICO A', `${AUGUST}-10`, 8500);
    addTestCardCharge('SERVICO A', `${SEPTEMBER}-10`, 10_000);
    addTestCardCharge('SERVICO B', `${AUGUST}-10`, 8499);
    addTestCardCharge('SERVICO B', `${SEPTEMBER}-10`, 10_000);
    addTestCardCharge('SERVICO C', `${AUGUST}-10`, 11_500);
    addTestCardCharge('SERVICO C', `${SEPTEMBER}-10`, 10_000);

    const data = await readSubscriptions();

    expect(seeded(data, 'SERVICO A')).toBeDefined();
    expect(seeded(data, 'SERVICO B')).toBeUndefined();
    // It also holds when the price went down: 11.500 to 10.000 is 1.500 apart.
    expect(seeded(data, 'SERVICO C')).toBeDefined();
  });

  it('accepts a day up to 5 days apart and refuses 6', async () => {
    addTestCardCharge('SERVICO D', `${AUGUST}-10`, 5000);
    addTestCardCharge('SERVICO D', `${SEPTEMBER}-15`, 5000);
    addTestCardCharge('SERVICO E', `${AUGUST}-10`, 5000);
    addTestCardCharge('SERVICO E', `${SEPTEMBER}-16`, 5000);

    const data = await readSubscriptions();

    expect(seeded(data, 'SERVICO D')).toBeDefined();
    expect(seeded(data, 'SERVICO E')).toBeUndefined();
  });

  it('needs 2 months in a row: one month alone, or a gap, is not enough', async () => {
    addTestCardCharge('SERVICO F', `${SEPTEMBER}-10`, 5000);
    addTestCardCharge('SERVICO G', '2026-07-10', 5000);
    addTestCardCharge('SERVICO G', `${SEPTEMBER}-10`, 5000);

    const data = await readSubscriptions();

    expect(seeded(data, 'SERVICO F')).toBeUndefined();
    expect(seeded(data, 'SERVICO G')).toBeUndefined();
  });

  it('counts a run of 3 months and stops where the limits break', async () => {
    addTestCardCharge('SERVICO H', '2026-07-10', 9000);
    addTestCardCharge('SERVICO H', `${AUGUST}-10`, 5000);
    addTestCardCharge('SERVICO H', `${SEPTEMBER}-10`, 5200);

    expect(seeded(await readSubscriptions(), 'SERVICO H')?.monthsSeen).toBe(2);
  });

  it('ignores a description charged twice in a month, a purchase in installments and debit', async () => {
    addTestCardCharge('SERVICO I', `${AUGUST}-10`, 5000);
    addTestCardCharge('SERVICO I', `${SEPTEMBER}-10`, 5000);
    addTestCardCharge('SERVICO I', `${SEPTEMBER}-12`, 5000);
    const parceled = addTestCardCharge('SERVICO J', `${AUGUST}-10`, 5000);
    parceled.installment = { planId: 'plan', number: 1, count: 3 };
    addTestCardCharge('SERVICO J', `${SEPTEMBER}-10`, 5000);
    const debit = addTestCardCharge('SERVICO K', `${AUGUST}-10`, 5000);
    debit.method = 'debit';
    addTestCardCharge('SERVICO K', `${SEPTEMBER}-10`, 5000).method = 'debit';

    const data = await readSubscriptions();

    expect(seeded(data, 'SERVICO I')).toBeUndefined();
    expect(seeded(data, 'SERVICO J')).toBeUndefined();
    expect(seeded(data, 'SERVICO K')).toBeUndefined();
  });

  it('ignores a description whose last charge is older than last month', async () => {
    addTestCardCharge('SERVICO L', '2026-07-10', 5000);
    addTestCardCharge('SERVICO L', `${AUGUST}-10`, 5000);

    expect(seeded(await readSubscriptions(), 'SERVICO L')).toBeUndefined();
  });
});

describe('POST /subscriptions/suggestions/accept and /dismiss', () => {
  async function suggestionKey(text: string): Promise<string> {
    const key = (await readSubscriptions()).suggestions.find((item) =>
      item.description.includes(text),
    )?.key;
    if (!key) throw new Error(`No suggestion for ${text}`);

    return key;
  }

  it('creates the recurrence the way the contract says and links the charges it saw', async () => {
    const key = await suggestionKey('DEEZER PREMIUM');
    const answer = await callApi('POST', '/subscriptions/suggestions/accept', { key });
    expect(answer.status).toBe(201);
    const { recurrence, occurrence } = createRecurrenceResponseSchema.parse(answer.json);

    expect(recurrence).toMatchObject({
      kind: 'expense',
      method: 'credit',
      accountId: findTestCard().id,
      name: 'Deezer Premium',
      expectedAmountCents: 1990,
      matchText: 'DEEZER PREMIUM',
      dateRule: { type: 'fixed_day' },
    });
    expect(occurrence?.status).toBe('confirmed');

    // The three charges are linked to the occurrences of their months.
    const detail = recurrenceDetailDtoSchema.parse(
      (await callApi('GET', `/recurrences/${recurrence.id}`)).json,
    );
    expect(detail.history.filter((item) => item.payments.length === 1)).toHaveLength(3);

    // It is a subscription now, it shows in Recorrências and the suggestion is gone.
    const data = await readSubscriptions();
    expect(itemNamed(data, 'Deezer Premium').status).toBe('charged');
    expect(data.suggestions.map((item) => item.key)).not.toContain(key);
    const list = listResponseSchema(recurrenceListItemSchema).parse(
      (await callApi('GET', `/recurrences?month=${CURRENT_MONTH}`)).json,
    ).items;
    expect(list.map((item) => item.name)).toContain('Deezer Premium');
  });

  it('takes the name and the category the request overwrites', async () => {
    const key = await suggestionKey('LEITURA MENSAL');
    const category = db.categories.find((item) => item.kind === 'expense' && item.name !== '');
    if (!category) throw new Error('No expense category');

    const answer = await callApi('POST', '/subscriptions/suggestions/accept', {
      key,
      name: 'Clube de leitura',
      categoryId: category.id,
    });

    expect(createRecurrenceResponseSchema.parse(answer.json).recurrence).toMatchObject({
      name: 'Clube de leitura',
      categoryId: category.id,
    });
  });

  it('brings the suggestion back when the accepted recurrence is deleted (the undo)', async () => {
    const key = await suggestionKey('DEEZER PREMIUM');
    const { recurrence } = createRecurrenceResponseSchema.parse(
      (await callApi('POST', '/subscriptions/suggestions/accept', { key })).json,
    );

    expect((await callApi('DELETE', `/recurrences/${recurrence.id}`)).status).toBe(204);

    const data = await readSubscriptions();
    expect(data.suggestions.map((item) => item.key)).toContain(key);
    expect(data.items.map((item) => item.recurrence.name)).not.toContain('Deezer Premium');
  });

  it('dismisses by key: the suggestion does not come back, the others stay', async () => {
    const key = await suggestionKey('DEEZER PREMIUM');
    const before = (await readSubscriptions()).suggestions.length;

    expect((await callApi('POST', '/subscriptions/suggestions/dismiss', { key })).status).toBe(204);

    const after = await readSubscriptions();
    expect(after.suggestions.map((item) => item.key)).not.toContain(key);
    expect(after.suggestions).toHaveLength(before - 1);
    expect(db.subscriptionDismissals).toEqual([key]);
  });

  it('answers 404 SUBSCRIPTION_SUGGESTION_NOT_FOUND for a key that suggests nothing', async () => {
    for (const path of ['accept', 'dismiss']) {
      const answer = await callApi('POST', `/subscriptions/suggestions/${path}`, {
        key: 'NOTHING|card',
      });

      expect(answer.status).toBe(404);
      expect(answer.json).toMatchObject({ code: 'SUBSCRIPTION_SUGGESTION_NOT_FOUND' });
    }
  });

  it('refuses a body without the key', async () => {
    const answer = await callApi('POST', '/subscriptions/suggestions/dismiss', {});

    expect(answer.status).toBe(400);
  });
});
