import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { seedExampleOne } from '#tests/support/dashboard/dashboard/seed-example-one.util.ts';

describe('GET /dashboard/timeline', () => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld();
  });

  afterEach(async () => {
    await world.destroy();
  });

  const timeline = (query: string, request = world.send) =>
    world.get(`/dashboard/timeline${query}`, timelineDtoSchema, request);
  const free = (request = world.send) =>
    world.get('/dashboard/free-balance', freeBalanceDtoSchema, request);

  it('projects the balance day by day from today, and the last day is the Livre (R$ 7.707,29)', async () => {
    await seedExampleOne(world);

    const dto = await timeline('?month=2026-10');
    const livre = await free();

    expect(dto.today).toBe('2026-10-22');
    expect(dto.days).toHaveLength(31);
    expect(dto.endBalanceCents).toBe(livre.freeBalanceCents);
    expect(dto.endBalanceCents).toBe(770729);
    expect(dto.days.at(-1)?.projectedBalanceCents).toBe(770729);
    const balanceOf = (date: string) =>
      dto.days.find((day) => day.date === date)?.projectedBalanceCents;
    // Before today there is no projection; today already takes the late Diarista (R$ 180,00).
    expect(balanceOf('2026-10-21')).toBeNull();
    expect(balanceOf('2026-10-22')).toBe(540898 - 18000);
    // The 25th: Maxxy comes in (R$ 4.200,00) and the Academia goes out (R$ 109,90).
    expect(balanceOf('2026-10-25')).toBe(540898 - 18000 + 420000 - 10990);
  });

  it('lists the day, the chips and the last day: the late Diarista, the invoice that falls due after the month and Rafa', async () => {
    await seedExampleOne(world);

    const dto = await timeline('?month=2026-10');
    const itemsOf = (date: string) =>
      dto.days
        .find((day) => day.date === date)
        ?.items.map((item) => [item.title, item.flow, item.amountCents, item.state]);

    expect(dto.overdue.map((item) => [item.title, item.state, item.amountCents])).toEqual([
      ['Diarista', 'late', 18000],
    ]);
    // The second half of the Mesada has no day.
    expect(dto.undated.map((item) => [item.title, item.state, item.amountCents])).toEqual([
      ['Mesada', 'partial', 42500],
    ]);
    expect(itemsOf('2026-10-25')).toEqual([
      ['Academia', 'out', 10990, 'expected'],
      ['Maxxy', 'in', 420000, 'expected'],
    ]);
    // The invoice of Nubank falls due on 06/11: it lands on the last day, with Rafa (due on the 31st).
    expect(itemsOf('2026-10-31')).toEqual([
      ['Fatura Nubank', 'out', 161689, 'expected'],
      ['Você deve a Rafa', 'out', 30000, 'partial'],
    ]);
    // The Celular is in the invoice, the Bradesco invoice is already paid by the debit: not listed.
    const everything = dto.days
      .flatMap((day) => day.items.map((item) => item.title))
      .concat(dto.overdue.map((item) => item.title));
    expect(everything).not.toContain('Celular');
    expect(everything).not.toContain('Fatura Bradesco');
  });

  it('shows what happened in the month on the day it happened, with the state "happened"', async () => {
    await seedExampleOne(world);

    const dto = await timeline('?month=2026-10');

    const third = dto.days.find((day) => day.date === '2026-10-03')?.items ?? [];
    expect(third).toEqual([]);
    const paid = await world.send('GET', '/agenda?month=2026-10');
    expect(paid.status).toBe(200);
  });

  it('closes the 31/10 at the Livre: the closed invoice and the new open one both count, on the last day', async () => {
    const instant = '2026-10-31T15:00:00.000Z';
    const account = await world.bankAccount('Nubank conta', 500000);
    // Closes on the 30th: on the 31st the 2026-10 invoice is closed and a purchase of today is in 2026-11.
    const card = await world.card('Nubank', 30, 6);
    await world.purchase(card, 100000, '2026-10-12', '2026-10');
    await world.purchase(card, 30000, '2026-10-31', '2026-11');
    expect(account).toBeTruthy();

    const dto = await timeline('?month=2026-10', world.at(instant));
    const livre = await free(world.at(instant));

    expect(livre.payable.items.map((item) => [item.source.month, item.remainingCents])).toEqual([
      ['2026-10', 100000],
      ['2026-11', 30000],
    ]);
    expect(livre.freeBalanceCents).toBe(500000 - 130000);
    expect(dto.endBalanceCents).toBe(livre.freeBalanceCents);
    // Same title: by key, so the older invoice comes first.
    expect(dto.days.at(-1)?.items.map((item) => item.amountCents)).toEqual([100000, 30000]);
    expect(dto.days.at(-1)?.projectedBalanceCents).toBe(livre.freeBalanceCents);
    expect(livre.daysRemaining).toBe(1);
  });

  it('has no balance in another month, and shows what falls due in it', async () => {
    await seedExampleOne(world);

    const november = await timeline('?month=2026-11');
    const september = await timeline('?month=2026-09');

    expect(november.endBalanceCents).toBeNull();
    expect(november.days).toHaveLength(30);
    expect(november.days.every((day) => day.projectedBalanceCents === null && !day.isPast)).toBe(
      true,
    );
    expect(september.endBalanceCents).toBeNull();
    expect(september.days.every((day) => day.isPast)).toBe(true);
  });

  it('answers the strip of Recorrentes with the occurrences only, each on its day with its state', async () => {
    await seedExampleOne(world);

    const dto = await timeline('?month=2026-10&scope=recurrences');

    const titles = dto.days.flatMap((day) => day.items.map((item) => item.title)).toSorted();
    expect(titles).toEqual(['Academia', 'Celular', 'Diarista', 'Internet', 'Maxxy']);
    expect(dto.undated.map((item) => item.title)).toEqual(['Mesada']);
    expect(dto.days.find((day) => day.date === '2026-10-05')?.items).toEqual([
      expect.objectContaining({ title: 'Diarista', state: 'late' }),
    ]);
    expect(
      dto.days.find((day) => day.date === '2026-10-28')?.items.map((item) => item.title),
    ).toEqual(['Celular', 'Internet']);
    expect(dto.overdue).toEqual([]);
    expect(dto.endBalanceCents).toBe(770729);
  });

  it('puts the occurrence with no day in "sem data" and the one that came along from an earlier month in the chips', async () => {
    const account = await world.bankAccount('Conta', 0);
    await world.recurrence({
      kind: 'income',
      name: 'Mesada, 2ª parte',
      expectedAmountCents: 42500,
      dateRule: { type: 'any_day' },
      accountId: account,
      method: 'pix',
    });
    // Born in September, late since the 5th: in October it comes along into the chips.
    await world.recurrence(
      {
        name: 'Diarista',
        expectedAmountCents: 18000,
        dateRule: { type: 'fixed_day', day: 5 },
        startsMonth: '2026-09',
        accountId: account,
        method: 'pix',
      },
      world.at('2026-09-22T15:00:00.000Z'),
    );

    const dto = await timeline('?month=2026-10&scope=recurrences');

    expect(dto.undated.map((item) => item.title)).toEqual(['Mesada, 2ª parte']);
    expect(dto.overdue.map((item) => [item.title, item.date])).toEqual([
      ['Diarista', '2026-09-05'],
    ]);
  });

  it('answers 400 for a bad month or scope and 401 without the token', async () => {
    await world.expectError(
      await world.send('GET', '/dashboard/timeline'),
      400,
      'VALIDATION_FAILED',
    );
    await world.expectError(
      await world.send('GET', '/dashboard/timeline?month=2026-10&scope=other'),
      400,
      'VALIDATION_FAILED',
    );
    await world.expectError(
      await world.send('GET', '/dashboard/timeline?month=2026-10', undefined, {
        'x-fincheck-token': 'x',
      }),
      401,
      'LOCAL_TOKEN_INVALID',
    );
  });
});
