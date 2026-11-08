import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { recurrenceSummarySchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { listSubscriptionsResponseSchema } from '@fincheck/shared/recurrences/subscription/subscription.schema.ts';
import { SUBSCRIPTION_SUGGESTION_EXCLUSIONS } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { isExcludedFromSuggestions } from '@fincheck/shared/recurrences/subscription-service/is-excluded-from-suggestions.util.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

// A small seeded generator (mulberry32): the same seed always draws the same scenario.
function random(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every field that ends in `Cents`, anywhere in the answer, is a whole number.
function assertWholeCents(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertWholeCents(item, `${path}[${String(index)}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) {
      if (key.endsWith('Cents') && typeof inner === 'number') {
        expect(Number.isSafeInteger(inner), `${path}.${key} = ${String(inner)}`).toBe(true);
      }
      assertWholeCents(inner, `${path}.${key}`);
    }
  }
}

describe('recurrence invariants', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const occurrenceRows = () =>
    world.database.db
      .selectFrom('recurrence_occurrences')
      .select(['recurrence_id', 'month'])
      .execute();

  it('never duplicates an occurrence: many reads at once, again and again, leave one per recurrence and month', async () => {
    for (const name of ['A', 'B', 'C', 'D', 'E']) {
      await world.create({ name, dateRule: { type: 'any_day' } });
    }
    await world.database.db.deleteFrom('recurrence_occurrences').execute();

    const reads = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        Promise.resolve(
          world.send(
            'GET',
            index % 3 === 0
              ? '/recurrences?month=2026-10'
              : index % 3 === 1
                ? '/occurrences?month=2026-10'
                : '/recurrences/summary?month=2026-10',
          ),
        ),
      ),
    );
    for (const read of reads) expect(read.status).toBe(200);
    await world.at('2026-11-02T15:00:00.000Z')('GET', '/recurrences?month=2026-11');
    await world.at('2026-11-02T15:00:00.000Z')('GET', '/recurrences?month=2026-11');

    const rows = await occurrenceRows();
    const keys = rows.map((row) => `${row.recurrence_id}|${row.month}`);
    expect(new Set(keys).size).toBe(keys.length);
    // 5 recurrences x (October to January, then February joins on 02/11).
    expect(keys).toHaveLength(5 * 5);
  });

  it.each([1, 2, 3, 4])(
    'keeps the money in whole cents, the received equal to the sum of the payments and the cards equal to the lines (seed %i)',
    async (seed) => {
      const draw = random(seed);
      const between = (low: number, high: number) => low + Math.floor(draw() * (high - low + 1));
      const created: { id: string; occurrenceId: string; kind: 'income' | 'expense' }[] = [];
      const rules = [
        { type: 'fixed_day', day: 5 },
        { type: 'fixed_day', day: 25, nonBusinessDayShift: 'after' },
        { type: 'business_day', businessDayNumber: 5 },
        { type: 'around_day', day: 20, toleranceDays: 3 },
        { type: 'any_day' },
        { type: 'any_day', day: 12 },
      ] as const;

      for (let index = 0; index < 8; index++) {
        const kind = draw() < 0.5 ? 'income' : 'expense';
        const { recurrence, occurrence } = await world.create({
          kind,
          name: `Recorrência ${String(index)}`,
          expectedAmountCents: between(100, 500000),
          maxPayments: between(1, 3),
          dateRule: rules[between(0, rules.length - 1)] as never,
        });
        created.push({ id: recurrence.id, occurrenceId: occurrence?.id ?? '', kind });
      }

      // Random payments, some of which the rules refuse (wrong kind, already tied).
      const transactions: string[] = [];
      for (let index = 0; index < 25; index++) {
        const side = draw() < 0.5 ? 'income' : 'expense';
        const cents = between(1, 600000);
        const on = `2026-10-${String(between(1, 22)).padStart(2, '0')}`;
        transactions.push(
          side === 'income'
            ? await insertTestIncome(world.database.db, world.checking, { cents, on })
            : await insertTestExpense(world.database.db, world.checking, { cents, on }),
        );
      }
      let accepted = 0;
      for (let index = 0; index < 60; index++) {
        const target = created[between(0, created.length - 1)];
        const transactionId = transactions[between(0, transactions.length - 1)];
        const response = await world.send('POST', `/occurrences/${target?.occurrenceId}/payments`, {
          transactionId,
        });
        expect([201, 409, 422]).toContain(response.status);
        if (response.status === 201) accepted += 1;
      }
      // Random marks and answers.
      for (const target of created) {
        const roll = draw();
        if (roll < 0.2) await world.send('POST', `/occurrences/${target.occurrenceId}/skip`);
        else if (roll < 0.35)
          await world.send('POST', `/occurrences/${target.occurrenceId}/settle`);
        else if (roll < 0.5) {
          await world.send('POST', `/occurrences/${target.occurrenceId}/difference`, {
            decision: draw() < 0.5 ? 'update' : 'keep',
          });
        }
      }
      // Random ignoring of some transactions changes what each payment is worth.
      for (const id of transactions.filter(() => draw() < 0.2)) {
        await world.send('POST', `/transactions/${id}/ignore`);
      }

      const response = await world.send('GET', '/occurrences?month=2026-10');
      const items = listResponseSchema(occurrenceDtoSchema).parse(await response.json()).items;
      assertWholeCents(items);

      for (const item of items) {
        const sum = item.payments.reduce((total, payment) => total + payment.amountCents, 0);
        expect(item.receivedCents).toBe(sum);
        expect(item.expectedAmountCents).toBeGreaterThan(0);
        for (const payment of item.payments) {
          expect(payment.amountCents).toBeGreaterThan(0);
        }
        if (item.status === 'confirmed' || item.status === 'skipped') {
          expect(item.remainingCents).toBe(0);
        } else {
          expect(item.remainingCents).toBe(
            Math.max(0, item.expectedAmountCents - item.receivedCents),
          );
        }
        if (item.difference) {
          expect(item.status).toBe('confirmed');
          expect(item.settledAt).toBeNull();
          expect(item.difference.amountCents).toBe(item.receivedCents - item.expectedAmountCents);
          expect(item.difference.amountCents).not.toBe(0);
        }
        expect(item.needsAttention).toBe(
          item.status === 'late' || (item.difference !== null && item.difference.decision === null),
        );
      }

      // The cards are the sum of the lines.
      const summary = recurrenceSummarySchema.parse(
        await (await world.send('GET', '/recurrences/summary?month=2026-10')).json(),
      );
      assertWholeCents(summary);
      const counted = items.filter((item) => !item.carriedOver && item.status !== 'skipped');
      const incomes = counted.filter((item) => item.kind === 'income');
      const expenses = counted.filter((item) => item.kind === 'expense');
      expect(summary.incomes).toEqual({
        expectedCents: incomes.reduce((total, item) => total + item.expectedAmountCents, 0),
        receivedCents: incomes.reduce((total, item) => total + item.receivedCents, 0),
        count: incomes.length,
      });
      expect(summary.expenses).toEqual({
        expectedCents: expenses.reduce((total, item) => total + item.expectedAmountCents, 0),
        paidCount: expenses.filter((item) => item.status === 'confirmed').length,
        lateCount: expenses.filter((item) => item.status === 'late').length,
        differentCount: expenses.filter((item) => item.difference?.decision === null).length,
        count: expenses.length,
      });

      // A transaction settles one occurrence at most, and the payments written are the ones accepted.
      const payments = await world.database.db
        .selectFrom('occurrence_payments')
        .select('transaction_id')
        .execute();
      expect(new Set(payments.map((payment) => payment.transaction_id)).size).toBe(payments.length);
      expect(payments).toHaveLength(accepted);
    },
  );

  it('never answers a suggestion for a description of the exclusion list, however it is written', async () => {
    const draw = random(7);
    // One description per pattern of the list, written the way a bank prints it.
    const samples = [
      'IFOOD *PEDIDO',
      'iFood Restaurante',
      'IFD*LANCHES',
      'RAPPI BRASIL',
      'UBER EATS',
      'AIQFOME',
      'ZE DELIVERY',
      'DELIVERY RAPIDO',
      'RESTAURANTE DO ZE',
      'Restaurantes Sabor',
      'LANCHONETE 1',
      'PIZZARIA NAPOLI',
      'HAMBURGUERIA X',
      'PADARIA PAO',
      'BAR DO ZE',
      'SUPERMERCADO ABC',
      'SUPERMERCADOS BH',
      'MERCADO CENTRAL',
      'HORTIFRUTI VERDE',
      'ATACADAO 123',
      'ATACADISTA X',
      'UBER *TRIP',
      '99 APP',
      '99 POP',
      'CABIFY',
      'INDRIVE',
      'POSTO SHELL',
      'COMBUSTIVEL X',
      'COMBUSTIVEIS Y',
      'SHELL BOX',
      'IPIRANGA',
      'PETROBRAS AV',
    ];
    expect(SUBSCRIPTION_SUGGESTION_EXCLUSIONS.length).toBeGreaterThan(0);
    for (const sample of samples) expect(isExcludedFromSuggestions(sample), sample).toBe(true);

    for (const sample of samples) {
      const prefix = draw() < 0.3 ? 'PAG*' : '';
      const description = `${prefix}${draw() < 0.5 ? sample : sample.toLowerCase()}`;
      for (const on of ['2026-09-12', '2026-10-12']) {
        await insertTestExpense(world.database.db, world.card, {
          cents: 4590,
          on,
          description,
          overrides: { method: 'credit', invoice_month: on.slice(0, 7) },
        });
      }
    }
    // A control that must come through, so an empty answer does not pass for the right reason.
    for (const on of ['2026-09-03', '2026-10-03']) {
      await insertTestExpense(world.database.db, world.card, {
        cents: 2190,
        on,
        description: 'SPOTIFY AB',
        overrides: { method: 'credit', invoice_month: on.slice(0, 7) },
      });
    }

    const response = await world.send('GET', '/subscriptions');
    const { suggestions } = listSubscriptionsResponseSchema.parse(await response.json());

    expect(suggestions.map((suggestion) => suggestion.description)).toEqual(['SPOTIFY AB']);
    for (const suggestion of suggestions)
      expect(isExcludedFromSuggestions(suggestion.description)).toBe(false);
  });

  it('writes the money of a subscription answer in whole cents', async () => {
    await world.create({
      isSubscription: true,
      expectedAmountCents: 5590,
      accountId: world.card,
      method: 'credit',
    });

    const answer: unknown = await (await world.send('GET', '/subscriptions')).json();

    assertWholeCents(answer);
  });
});
