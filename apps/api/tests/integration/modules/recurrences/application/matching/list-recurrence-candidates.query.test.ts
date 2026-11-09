import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

// What the "Para revisar" queue offers for a transaction (`RecurrenceCandidateReader`): the
// occurrences it could settle, by the same rule as the automatic match (BR-REC-006, 010, 012).
// 22/10/2026, with the allowance and the meal voucher from the same sender.
describe('the recurrence candidates of the review queue', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;
  let mesada: string;
  let vr: string;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
    mesada = (
      await world.create({
        kind: 'income',
        name: 'Mesada',
        expectedAmountCents: 85000,
        maxPayments: 2,
        matchText: 'pai',
        dateRule: { type: 'any_day' },
      })
    ).recurrence.id;
    vr = (
      await world.create({
        kind: 'income',
        name: 'VR',
        expectedAmountCents: 77700,
        matchText: 'pai',
        dateRule: { type: 'any_day', day: 5 },
      })
    ).recurrence.id;
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const pix = (cents: number, on: string, counterparty: string | null = 'PAI') =>
    insertTestIncome(world.database.db, world.checking, { cents, on, counterparty });
  const candidatesOf = async (transactionId: string) => {
    const response = await world.send('GET', '/transactions/review-queue');
    expect(response.status).toBe(200);
    const item = reviewQueueDtoSchema
      .parse(await response.json())
      .items.find((candidate) => candidate.transaction.id === transactionId);

    return item?.recurrenceCandidates;
  };

  it('offers the allowance for R$ 425,00: it is one of its two parts and fits nothing else', async () => {
    const id = await pix(42500, '2026-10-03');

    expect(await candidatesOf(id)).toEqual([
      expect.objectContaining({
        recurrenceId: mesada,
        recurrenceName: 'Mesada',
        month: '2026-10',
        expectedAmountCents: 85000,
        remainingCents: 85000,
      }),
    ]);
  });

  it('offers only the voucher for R$ 777,00: both fit the 15%, only the voucher is exact', async () => {
    const id = await pix(77700, '2026-10-02');

    expect((await candidatesOf(id))?.map((item) => item.recurrenceId)).toEqual([vr]);
  });

  it('offers both for R$ 600,00: no value fits, the sender does', async () => {
    const id = await pix(60000, '2026-10-04');

    expect((await candidatesOf(id))?.map((item) => item.recurrenceName)).toEqual(['Mesada', 'VR']);
  });

  it('offers both when two fit and none is exact', async () => {
    const id = await pix(80000, '2026-10-04');

    expect((await candidatesOf(id))?.map((item) => item.recurrenceName)).toEqual(['Mesada', 'VR']);
  });

  it('offers nothing for another sender with a value that fits nothing', async () => {
    const id = await pix(60000, '2026-10-04', 'LOJA X');

    expect(await candidatesOf(id)).toEqual([]);
  });

  it('reads the sender in the description of the bank and in the description in use too', async () => {
    const id = await insertTestIncome(world.database.db, world.checking, {
      cents: 60000,
      on: '2026-10-04',
      counterparty: null,
      description: 'Pix do pai',
    });

    expect((await candidatesOf(id))?.map((item) => item.recurrenceName)).toEqual(['Mesada', 'VR']);
  });

  it('shrinks what is left after a payment: the second R$ 425,00 is exactly what is left', async () => {
    const first = await pix(42500, '2026-10-03');
    const mesadaOccurrence = (
      (await (await world.send('GET', '/occurrences?month=2026-10')).json()) as {
        items: { id: string; recurrenceId: string }[];
      }
    ).items.find((item) => item.recurrenceId === mesada);
    await world.send('POST', `/occurrences/${mesadaOccurrence?.id}/payments`, {
      transactionId: first,
    });
    const second = await pix(42500, '2026-10-20');

    expect(await candidatesOf(second)).toEqual([
      expect.objectContaining({ recurrenceId: mesada, remainingCents: 42500 }),
    ]);
  });

  it('offers nothing for a transaction that already settles an occurrence', async () => {
    const id = await pix(42500, '2026-10-03');
    const occurrence = (
      (await (await world.send('GET', '/occurrences?month=2026-10')).json()) as {
        items: { id: string; recurrenceId: string }[];
      }
    ).items.find((item) => item.recurrenceId === mesada);
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, { transactionId: id });
    // Back in the queue: it has no category (the recurrence has none to give).
    expect(await candidatesOf(id)).toEqual([]);
  });

  it('offers nothing for the debits of an income recurrence, nor the credits of an expense one', async () => {
    await world.create({ name: 'Aluguel', expectedAmountCents: 150000, matchText: 'imobiliaria' });
    const debit = await insertTestExpense(world.database.db, world.checking, {
      cents: 60000,
      on: '2026-10-04',
      description: 'Pix pai',
    });

    expect(await candidatesOf(debit)).toEqual([]);
  });

  it('does not offer the occurrence of a paused or deleted recurrence, nor one already confirmed or skipped', async () => {
    const id = await pix(60000, '2026-10-04');
    await world.send('POST', `/recurrences/${mesada}/pause`);
    expect((await candidatesOf(id))?.map((item) => item.recurrenceName)).toEqual(['VR']);

    await world.send('DELETE', `/recurrences/${vr}`);
    expect(await candidatesOf(id)).toEqual([]);
  });

  it('does not offer an occurrence the window of which has not begun, and keeps offering the late one with no limit', async () => {
    const maxxy = (
      await world.create({
        kind: 'income',
        name: 'Maxxy',
        expectedAmountCents: 420000,
        matchText: 'g prado',
        dateRule: { type: 'around_day', day: 25, toleranceDays: 2 },
      })
    ).recurrence;
    const early = await pix(420000, '2026-10-10', 'G PRADO');
    const late = await pix(420000, '2026-10-29', 'G PRADO');

    expect(await candidatesOf(early)).toEqual([]);
    // 29/10 is after the window (23 to 27): the occurrence is not late yet on 22/10, so the window
    // rule holds; a clock past the window makes it late, and then it takes any later day.
    expect(await candidatesOf(late)).toEqual([]);
    const november = world.at('2026-10-30T15:00:00.000Z');
    const response = await november('GET', '/transactions/review-queue');
    const item = reviewQueueDtoSchema
      .parse(await response.json())
      .items.find((candidate) => candidate.transaction.id === late);
    expect(item?.recurrenceCandidates).toEqual([
      expect.objectContaining({ recurrenceId: maxxy.id, month: '2026-10' }),
    ]);
  });

  it('puts the oldest month first when one recurrence has two open', async () => {
    await world.send('POST', `/recurrences/${vr}/pause`);
    await world.send('POST', `/recurrences/${mesada}/pause`);
    const november = world.at('2026-11-03T15:00:00.000Z');
    await november('POST', `/recurrences/${mesada}/resume`);
    const id = await insertTestIncome(world.database.db, world.checking, {
      cents: 42500,
      on: '2026-11-03',
      counterparty: 'PAI',
    });

    const response = await november('GET', '/transactions/review-queue');
    const item = reviewQueueDtoSchema
      .parse(await response.json())
      .items.find((candidate) => candidate.transaction.id === id);

    // October of the allowance is still open (late) and takes the Pix before November.
    expect(item?.recurrenceCandidates.map((candidate) => candidate.month)).toEqual(['2026-10']);
  });
});

// "Quantas vierem" (`maxPayments` null): the occurrence stays a candidate however many payments it
// already has, and a numbered one stops being offered when its payments are all there.
describe('the recurrence candidates of "as many as come"', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const linkPixes = async (occurrenceId: string, count: number) => {
    for (let index = 0; index < count; index += 1) {
      const transactionId = await insertTestIncome(world.database.db, world.checking, {
        cents: 10000,
        on: `2026-10-0${String(index + 1)}`,
        counterparty: 'PAI',
      });
      const response = await world.send('POST', `/occurrences/${occurrenceId}/payments`, {
        transactionId,
      });
      expect(response.status).toBe(201);
    }
  };
  const candidatesOf = async (transactionId: string) => {
    const response = await world.send('GET', '/transactions/review-queue');
    const item = reviewQueueDtoSchema
      .parse(await response.json())
      .items.find((candidate) => candidate.transaction.id === transactionId);

    return item?.recurrenceCandidates;
  };

  it('keeps offering the occurrence after six payments, for exactly what is left', async () => {
    const { recurrence, occurrence } = await world.create({
      kind: 'income',
      name: 'Mesada + VR',
      expectedAmountCents: 127002,
      maxPayments: null,
      matchText: 'pai',
      dateRule: { type: 'any_day' },
    });
    await linkPixes(occurrence?.id ?? '', 6);
    const next = await insertTestIncome(world.database.db, world.checking, {
      cents: 67002,
      on: '2026-10-20',
      counterparty: 'PAI',
    });

    expect(await candidatesOf(next)).toEqual([
      expect.objectContaining({
        recurrenceId: recurrence.id,
        expectedAmountCents: 127002,
        remainingCents: 67002,
      }),
    ]);
  });

  it('stops offering a numbered recurrence that has all its payments', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Mesada',
      expectedAmountCents: 127002,
      maxPayments: 2,
      matchText: 'pai',
      dateRule: { type: 'any_day' },
    });
    await linkPixes(occurrence?.id ?? '', 2);
    const next = await insertTestIncome(world.database.db, world.checking, {
      cents: 107002,
      on: '2026-10-20',
      counterparty: 'PAI',
    });

    expect(await candidatesOf(next)).toEqual([]);
  });
});
