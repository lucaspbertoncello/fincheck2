import {
  listSubscriptionsResponseSchema,
  subscriptionSuggestionSchema,
} from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { createRecurrenceResponseSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';

const MISSING = '01939000-0000-7000-8000-00000000dead';

describe('subscription routes', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const cardPurchase = (description: string, on: string, cents: number) =>
    insertTestExpense(world.database.db, world.card, {
      cents,
      on,
      description,
      overrides: { method: 'credit', invoice_month: on.slice(0, 7) },
    });
  const subscriptionsOf = async (query = '', request = world.send) => {
    const response = await request('GET', `/subscriptions${query}`);
    expect(response.status).toBe(200);

    return listSubscriptionsResponseSchema.parse(await response.json());
  };
  const netflix = (overrides: Record<string, unknown> = {}) =>
    world.create({
      name: 'Netflix',
      isSubscription: true,
      serviceSlug: 'netflix',
      accountId: world.card,
      method: 'credit',
      matchText: 'NETFLIX',
      expectedAmountCents: 5590,
      dateRule: { type: 'fixed_day', day: 12 },
      ...overrides,
    });

  describe('GET /subscriptions', () => {
    it('answers an empty tab: zero in the summary, no rows, no suggestion', async () => {
      expect(await subscriptionsOf()).toEqual({
        summary: { activeCount: 0, monthlyTotalCents: 0, yearlyTotalCents: 0 },
        items: [],
        suggestions: [],
      });
    });

    it('lists the recurrences marked as a subscription, of any method, and not the others', async () => {
      await netflix();
      await world.create({
        name: 'Clube do livro',
        isSubscription: true,
        accountId: world.checking,
        method: 'pix',
        expectedAmountCents: 3900,
        dateRule: { type: 'fixed_day', day: 20 },
      });
      await world.create({ name: 'Aluguel', expectedAmountCents: 150000 });

      const { items } = await subscriptionsOf();

      expect(items.map((item) => item.recurrence.name)).toEqual(['Netflix', 'Clube do livro']);
      expect(items.map((item) => item.chargeDay)).toEqual([12, 20]);
    });

    it('sums the active ones by month and by year (12 x the month), with no paused or deleted one', async () => {
      await netflix();
      await world.create({
        name: 'Spotify',
        isSubscription: true,
        serviceSlug: 'spotify',
        expectedAmountCents: 2190,
        dateRule: { type: 'fixed_day', day: 3 },
      });
      const paused = await world.create({
        name: 'Pausada',
        isSubscription: true,
        expectedAmountCents: 1000,
      });
      const gone = await world.create({
        name: 'Excluída',
        isSubscription: true,
        expectedAmountCents: 2000,
      });
      await world.send('POST', `/recurrences/${paused.recurrence.id}/pause`);
      await world.send('DELETE', `/recurrences/${gone.recurrence.id}`);

      const { summary } = await subscriptionsOf();

      expect(summary).toEqual({
        activeCount: 2,
        monthlyTotalCents: 7780,
        yearlyTotalCents: 93360,
      });
    });

    it('warns "não cobrou" when the window of the month passed with no charge', async () => {
      await netflix();

      const [item] = (await subscriptionsOf()).items;

      expect(item).toMatchObject({
        status: 'missed',
        lastChargeCents: null,
        alert: { kind: 'missed' },
      });
      expect(item?.recurrence.occurrence).toMatchObject({ month: '2026-10', status: 'late' });
    });

    it('is still to come before the day, and charged once the charge is on the card', async () => {
      await netflix({ dateRule: { type: 'fixed_day', day: 25 } });

      expect((await subscriptionsOf()).items[0]).toMatchObject({ status: 'upcoming', alert: null });

      await cardPurchase('NETFLIX.COM', '2026-10-21', 5590);
      expect((await subscriptionsOf()).items[0]).toMatchObject({
        status: 'charged',
        lastChargeCents: 5590,
        alert: null,
      });
    });

    it('warns that the price changed when the last charge differs by more than R$ 0,50, and stops when it is updated', async () => {
      const { recurrence } = await netflix();
      await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
      await cardPurchase('NETFLIX.COM', '2026-10-12', 5990);

      expect((await subscriptionsOf()).items[0]).toMatchObject({
        status: 'charged',
        lastChargeCents: 5990,
        alert: { kind: 'price_changed', fromCents: 5590, toCents: 5990 },
      });

      await world.send('PATCH', `/recurrences/${recurrence.id}`, { expectedAmountCents: 5990 });
      expect((await subscriptionsOf()).items[0]?.alert).toBeNull();
    });

    it('does not warn for a difference of R$ 0,50 or less', async () => {
      await netflix();
      await cardPurchase('NETFLIX.COM', '2026-10-12', 5640);

      expect((await subscriptionsOf()).items[0]?.alert).toBeNull();
    });

    it('does not take a charge that only has the name inside a longer word for the charge of a short-named subscription', async () => {
      // "Max" with no sender text: "MAXXY ACADEMIA" is not "Max".
      await world.create({
        name: 'Max',
        isSubscription: true,
        accountId: world.card,
        method: 'credit',
        expectedAmountCents: 3490,
        dateRule: { type: 'fixed_day', day: 12 },
      });
      await cardPurchase('MAXXY ACADEMIA', '2026-10-12', 3490);

      expect((await subscriptionsOf()).items[0]).toMatchObject({
        status: 'missed',
        lastChargeCents: null,
        alert: { kind: 'missed' },
      });

      await cardPurchase('HBO MAX', '2026-10-13', 3490);
      expect((await subscriptionsOf()).items[0]).toMatchObject({
        status: 'charged',
        lastChargeCents: 3490,
      });
    });

    it('does not let a short-named subscription cover the suggestion of another description', async () => {
      await world.create({
        name: 'Max',
        isSubscription: true,
        accountId: world.card,
        method: 'credit',
        expectedAmountCents: 3490,
      });
      await cardPurchase('MAXXY ACADEMIA', '2026-09-12', 8990);
      await cardPurchase('MAXXY ACADEMIA', '2026-10-12', 8990);

      expect((await subscriptionsOf()).suggestions.map((item) => item.description)).toEqual([
        'MAXXY ACADEMIA',
      ]);
    });

    it('tells the charges of a subscription on a card by its text and the ones tied to its occurrences', async () => {
      const { occurrence } = await world.create({
        name: 'Plano de dados',
        isSubscription: true,
        accountId: world.checking,
        method: 'pix',
        expectedAmountCents: 4990,
        dateRule: { type: 'fixed_day', day: 8 },
      });
      const tied = await insertTestExpense(world.database.db, world.checking, {
        cents: 4990,
        on: '2026-10-08',
        description: 'Pix qualquer',
      });
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: tied });

      expect((await subscriptionsOf()).items[0]).toMatchObject({
        status: 'charged',
        lastChargeCents: 4990,
      });
    });

    it('lists a deleted or paused subscription only when it charged after it ended', async () => {
      const deleted = await netflix();
      const paused = await world.create({
        name: 'Spotify',
        isSubscription: true,
        accountId: world.card,
        method: 'credit',
        matchText: 'SPOTIFY',
        expectedAmountCents: 2190,
        dateRule: { type: 'fixed_day', day: 3 },
      });
      await world.send('DELETE', `/recurrences/${deleted.recurrence.id}`);
      await world.send('POST', `/recurrences/${paused.recurrence.id}/pause`);
      expect((await subscriptionsOf()).items).toEqual([]);

      const charge = await cardPurchase('NETFLIX.COM', '2026-10-25', 5590);
      await cardPurchase('SPOTIFY AB', '2026-10-26', 2190);

      const { items, summary } = await subscriptionsOf();

      expect(items.map((item) => item.recurrence.name)).toEqual(['Spotify', 'Netflix']);
      expect(items[1]).toMatchObject({
        status: 'charged',
        alert: {
          kind: 'charged_after_end',
          amountCents: 5590,
          occurredOn: '2026-10-25',
          transactionId: charge,
        },
      });
      expect(items[0]?.alert).toMatchObject({ kind: 'charged_after_end', amountCents: 2190 });
      expect(summary.activeCount).toBe(0);
    });

    it('looks at the month asked: a month before the subscription started has no row', async () => {
      await netflix({ startsMonth: '2026-10' });

      expect((await subscriptionsOf('?month=2026-09')).items).toEqual([]);
      expect((await subscriptionsOf('?month=2026-10')).items).toHaveLength(1);
    });

    it('answers 400 for a month that is malformed or out of range, and 401 without the token', async () => {
      for (const query of ['?month=2026-13', '?month=abc', '?month=1999-01']) {
        await world.expectError(
          await world.send('GET', `/subscriptions${query}`),
          400,
          'VALIDATION_FAILED',
        );
      }
      await world.expectError(
        await world.send('GET', '/subscriptions', undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('the suggestions (BR-REC-017)', () => {
    const suggestionsOf = async () => (await subscriptionsOf()).suggestions;

    it('suggests a description that came back 2 months in a row on a card', async () => {
      const first = await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
      const second = await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);

      const [suggestion] = await suggestionsOf();

      expect(subscriptionSuggestionSchema.parse(suggestion)).toEqual({
        key: `NETFLIX.COM|${world.card}`,
        description: 'NETFLIX.COM',
        accountId: world.card,
        lastAmountCents: 5590,
        lastChargedOn: '2026-10-12',
        monthsSeen: 2,
        transactionIds: [first, second],
      });
    });

    it('never suggests what the exclusion list names: delivery, restaurant, groceries, ride apps, fuel', async () => {
      for (const description of [
        'IFOOD *PEDIDO',
        'RESTAURANTE DO ZE',
        'SUPERMERCADO ABC',
        'UBER *TRIP',
        'POSTO SHELL',
      ]) {
        await cardPurchase(description, '2026-09-12', 4590);
        await cardPurchase(description, '2026-10-12', 4590);
      }
      await cardPurchase('SPOTIFY AB', '2026-09-03', 2190);
      await cardPurchase('SPOTIFY AB', '2026-10-03', 2190);

      expect((await suggestionsOf()).map((item) => item.description)).toEqual(['SPOTIFY AB']);
    });

    it('does not suggest what a recurrence on the card already covers, nor installments, nor a debit on a checking account', async () => {
      await netflix();
      await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
      await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1990,
        on: '2026-09-05',
        description: 'CLUBE X',
      });
      await insertTestExpense(world.database.db, world.checking, {
        cents: 1990,
        on: '2026-10-05',
        description: 'CLUBE X',
      });

      expect(await suggestionsOf()).toEqual([]);
    });

    it('does not suggest a charge that is already the payment of an occurrence of a live recurrence', async () => {
      const { occurrence } = await world.create({
        name: 'Qualquer',
        accountId: world.card,
        method: 'credit',
        expectedAmountCents: 5590,
      });
      const tied = await cardPurchase('STREAM Z', '2026-10-12', 5590);
      await cardPurchase('STREAM Z', '2026-09-12', 5590);
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: tied });

      expect(await suggestionsOf()).toEqual([]);
    });

    describe('POST /subscriptions/suggestions/dismiss', () => {
      it('records "Agora não": the suggestion of that description on that card does not come back', async () => {
        await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
        await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);
        const key = `NETFLIX.COM|${world.card}`;

        const response = await world.send('POST', '/subscriptions/suggestions/dismiss', { key });

        expect(response.status).toBe(204);
        expect(await response.text()).toBe('');
        expect(await suggestionsOf()).toEqual([]);
        const rows = await world.database.db
          .selectFrom('subscription_suggestion_dismissals')
          .selectAll()
          .execute();
        expect(rows.map((row) => [row.pattern, row.account_id])).toEqual([
          ['NETFLIX.COM', world.card],
        ]);
        expect(rows[0]?.dismissed_at).toBe('2026-10-22T15:00:00.000Z');
      });

      it('answering twice records once and answers 204 again', async () => {
        await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
        await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);
        const key = `NETFLIX.COM|${world.card}`;

        await world.send('POST', '/subscriptions/suggestions/dismiss', { key });
        const again = await world.send('POST', '/subscriptions/suggestions/dismiss', { key });

        expect(again.status).toBe(204);
        expect(
          await world.database.db
            .selectFrom('subscription_suggestion_dismissals')
            .selectAll()
            .execute(),
        ).toHaveLength(1);
      });

      it('404 SUBSCRIPTION_SUGGESTION_NOT_FOUND for a key that yields no suggestion, nothing is recorded', async () => {
        await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);

        for (const key of [
          `NETFLIX.COM|${world.card}`,
          `OUTRA COISA|${world.card}`,
          'sem-barra',
          `X|${MISSING}`,
        ]) {
          await world.expectError(
            await world.send('POST', '/subscriptions/suggestions/dismiss', { key }),
            404,
            'SUBSCRIPTION_SUGGESTION_NOT_FOUND',
          );
        }
        expect(
          await world.database.db
            .selectFrom('subscription_suggestion_dismissals')
            .selectAll()
            .execute(),
        ).toEqual([]);
      });

      it('400 without a key and 401 without the token', async () => {
        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/dismiss', {}),
          400,
          'VALIDATION_FAILED',
        );
        await world.expectError(
          await world.send(
            'POST',
            '/subscriptions/suggestions/dismiss',
            { key: 'a|b' },
            { [LOCAL_TOKEN_HEADER]: 'wrong' },
          ),
          401,
          'LOCAL_TOKEN_INVALID',
        );
      });
    });

    describe('POST /subscriptions/suggestions/accept', () => {
      const seen = async () => {
        const ids = [
          await cardPurchase('NETFLIX.COM', '2026-08-12', 5590),
          await cardPurchase('NETFLIX.COM', '2026-09-12', 5590),
          await cardPurchase('NETFLIX.COM', '2026-10-12', 5990),
        ];

        return { ids, key: `NETFLIX.COM|${world.card}` };
      };
      const accept = async (body: Record<string, unknown>, status = 201) => {
        const response = await world.send('POST', '/subscriptions/suggestions/accept', body);
        expect(response.status).toBe(status);

        return createRecurrenceResponseSchema.parse(await response.json());
      };

      it('creates the recurrence it proposes: expense, a subscription, on the card, the day and amount of the last charge', async () => {
        const { key } = await seen();

        const { recurrence, occurrence } = await accept({ key });

        expect(recurrence).toMatchObject({
          kind: 'expense',
          name: 'Netflix.com',
          expectedAmountCents: 5990,
          amountMode: 'fixed',
          matchText: 'NETFLIX.COM',
          accountId: world.card,
          method: 'credit',
          isSubscription: true,
          serviceSlug: 'netflix',
          maxPayments: 1,
          startsMonth: '2026-08',
          dateRule: { type: 'fixed_day', day: 12, nonBusinessDayShift: 'none' },
        });
        expect(occurrence).toMatchObject({
          month: '2026-10',
          status: 'confirmed',
          receivedCents: 5990,
        });
      });

      it('ties the charges it saw to the occurrences of their own months, Lucas as the author, with no difference to answer', async () => {
        const { ids, key } = await seen();

        const { recurrence } = await accept({ key });

        const rows = await world.database.db
          .selectFrom('occurrence_payments as p')
          .innerJoin('recurrence_occurrences as o', 'o.id', 'p.occurrence_id')
          .select([
            'o.month',
            'p.transaction_id',
            'p.linked_by',
            'p.amount_cents',
            'o.expected_amount_cents',
          ])
          .where('o.recurrence_id', '=', recurrence.id)
          .orderBy('o.month')
          .execute();
        expect(rows).toEqual([
          {
            month: '2026-08',
            transaction_id: ids[0],
            linked_by: 'user',
            amount_cents: 5590,
            expected_amount_cents: 5590,
          },
          {
            month: '2026-09',
            transaction_id: ids[1],
            linked_by: 'user',
            amount_cents: 5590,
            expected_amount_cents: 5590,
          },
          {
            month: '2026-10',
            transaction_id: ids[2],
            linked_by: 'user',
            amount_cents: 5990,
            expected_amount_cents: 5990,
          },
        ]);
        // Nothing asks for an answer in the months that passed.
        const list = await world.at('2026-11-05T15:00:00.000Z')(
          'GET',
          '/occurrences?month=2026-11&needsAttention=true',
        );
        expect(((await list.json()) as { items: unknown[] }).items).toEqual([]);
      });

      it('takes the name, the category, the sender text, the counterparty and the service of the body over what it proposes', async () => {
        const categoryId = await insertTestCategory(world.database.db, { name: 'Streaming teste' });
        const { key } = await seen();

        const { recurrence } = await accept({
          key,
          name: 'Netflix da casa',
          categoryId,
          matchText: 'netflix com',
          counterparty: 'Netflix Brasil',
          serviceSlug: 'primevideo',
        });

        expect(recurrence).toMatchObject({
          name: 'Netflix da casa',
          categoryId,
          matchText: 'NETFLIX COM',
          counterparty: 'Netflix Brasil',
          serviceSlug: 'primevideo',
        });
      });

      it('puts the category on the charges that have none', async () => {
        const categoryId = await insertTestCategory(world.database.db, { name: 'Streaming teste' });
        const { ids, key } = await seen();

        await accept({ key, categoryId });

        const row = await world.database.db
          .selectFrom('transactions')
          .select(['category_id', 'category_source'])
          .where('id', '=', ids[2] ?? '')
          .executeTakeFirstOrThrow();
        expect(row).toEqual({ category_id: categoryId, category_source: 'recurrence' });
      });

      it('proposes the name from the key: no "n/N" of the installment and no "*" of the card', async () => {
        await cardPurchase('GOOGLE *YOUTUBEMUSIC', '2026-09-12', 2190);
        await cardPurchase('GOOGLE *YOUTUBEMUSIC', '2026-10-12', 2190);
        await cardPurchase('SPOTIFY 3/12', '2026-09-03', 1990);
        await cardPurchase('SPOTIFY 4/12', '2026-10-03', 1990);

        const youtube = await accept({ key: `GOOGLE *YOUTUBEMUSIC|${world.card}` });
        const spotify = await accept({ key: `SPOTIFY|${world.card}` });

        expect(youtube.recurrence).toMatchObject({
          name: 'Google Youtubemusic',
          matchText: 'GOOGLE *YOUTUBEMUSIC',
        });
        expect(spotify.recurrence).toMatchObject({ name: 'Spotify', matchText: 'SPOTIFY' });
      });

      it('takes the service the body sends as it is, and only recognizes one when none is sent', async () => {
        await cardPurchase('NETFLIX.COM', '2026-09-12', 5590);
        await cardPurchase('NETFLIX.COM', '2026-10-12', 5590);
        await cardPurchase('SPOTIFY AB', '2026-09-03', 2190);
        await cardPurchase('SPOTIFY AB', '2026-10-03', 2190);

        const sent = await accept({ key: `NETFLIX.COM|${world.card}`, serviceSlug: 'deezer' });
        const recognized = await accept({ key: `SPOTIFY AB|${world.card}` });

        expect(sent.recurrence.serviceSlug).toBe('deezer');
        expect(recognized.recurrence.serviceSlug).toBe('spotify');
      });

      it('has no service when the body says "Outro" (null), and when the description names none', async () => {
        const { key } = await seen();
        const { recurrence } = await accept({ key, serviceSlug: null });
        expect(recurrence.serviceSlug).toBeNull();

        await cardPurchase('CLUBE DA LEITURA', '2026-09-05', 3000);
        await cardPurchase('CLUBE DA LEITURA', '2026-10-05', 3000);
        const other = await accept({ key: `CLUBE DA LEITURA|${world.card}` });
        expect(other.recurrence.serviceSlug).toBeNull();
      });

      it('only recognizes a service of the shared list', async () => {
        const { key } = await seen();

        const { recurrence } = await accept({ key });

        expect(SUBSCRIPTION_SERVICES.map((service) => service.slug)).toContain(
          recurrence.serviceSlug,
        );
      });

      it('makes the suggestion go away: the recurrence covers it', async () => {
        const { key } = await seen();

        await accept({ key });

        expect((await subscriptionsOf()).suggestions).toEqual([]);
        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/accept', { key }),
          404,
          'SUBSCRIPTION_SUGGESTION_NOT_FOUND',
        );
      });

      it('brings the subscription to the tab, charged', async () => {
        const { key } = await seen();
        await accept({ key });

        const { items, summary } = await subscriptionsOf();

        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ status: 'charged', chargeDay: 12, lastChargeCents: 5990 });
        expect(summary).toMatchObject({ activeCount: 1, monthlyTotalCents: 5990 });
      });

      it('is accepted again after "Desfazer" (deleting the recurrence): the charges go to the new one', async () => {
        const { ids, key } = await seen();
        const first = await accept({ key });
        await world.send('DELETE', `/recurrences/${first.recurrence.id}`);
        expect((await subscriptionsOf()).suggestions).toHaveLength(1);

        const second = await accept({ key });

        const rows = await world.database.db
          .selectFrom('occurrence_payments as p')
          .innerJoin('recurrence_occurrences as o', 'o.id', 'p.occurrence_id')
          .select(['p.transaction_id', 'o.recurrence_id'])
          .execute();
        expect(rows.map((row) => row.recurrence_id)).toEqual([
          second.recurrence.id,
          second.recurrence.id,
          second.recurrence.id,
        ]);
        expect(rows.map((row) => row.transaction_id).toSorted()).toEqual(ids.toSorted());
      });

      it('404 SUBSCRIPTION_SUGGESTION_NOT_FOUND for a key that yields no suggestion', async () => {
        await seen();

        for (const key of [`OUTRA COISA|${world.card}`, 'sem-barra']) {
          await world.expectError(
            await world.send('POST', '/subscriptions/suggestions/accept', { key }),
            404,
            'SUBSCRIPTION_SUGGESTION_NOT_FOUND',
          );
        }
      });

      it('404 CATEGORY_NOT_FOUND and 422 RECURRENCE_CATEGORY_KIND_MISMATCH, writing nothing', async () => {
        const { key } = await seen();
        const income = await insertTestCategory(world.database.db, {
          kind: 'income',
          name: 'Receita teste',
        });

        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/accept', {
            key,
            categoryId: MISSING,
          }),
          404,
          'CATEGORY_NOT_FOUND',
        );
        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/accept', {
            key,
            categoryId: income,
          }),
          422,
          'RECURRENCE_CATEGORY_KIND_MISMATCH',
        );
        expect(await world.database.db.selectFrom('recurrences').selectAll().execute()).toEqual([]);
      });

      it('400 without a key, for a name that is too long, and 401 without the token', async () => {
        const { key } = await seen();

        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/accept', {}),
          400,
          'VALIDATION_FAILED',
        );
        await world.expectError(
          await world.send('POST', '/subscriptions/suggestions/accept', {
            key,
            name: 'x'.repeat(81),
          }),
          400,
          'VALIDATION_FAILED',
        );
        await world.expectError(
          await world.send(
            'POST',
            '/subscriptions/suggestions/accept',
            { key },
            { [LOCAL_TOKEN_HEADER]: 'wrong' },
          ),
          401,
          'LOCAL_TOKEN_INVALID',
        );
      });
    });
  });
});
