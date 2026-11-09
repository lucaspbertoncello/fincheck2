import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { spendHeatmapDtoSchema } from '@fincheck/shared/dashboard/spend-heatmap/spend-heatmap.schema.ts';
import { spendingCurveDtoSchema } from '@fincheck/shared/dashboard/spending-curve/spending-curve.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';
import {
  createDashboardTestWorld,
  type DashboardTestWorld,
} from '#tests/support/dashboard/dashboard/create-dashboard-test-world.util.ts';
import { seedExampleOne } from '#tests/support/dashboard/dashboard/seed-example-one.util.ts';

// What must hold whatever the day: the numbers of the dashboard are one calculation seen from
// several routes, so they cannot disagree. Fixed seeds, three days of the clock (the 1st, the 22nd
// and 23:59 of the 31st in São Paulo).
const CLOCKS = ['2026-10-01T15:00:00.000Z', '2026-10-22T15:00:00.000Z', '2026-11-01T02:59:00.000Z'];

describe.each(CLOCKS)('the invariants of the dashboard at %s', (instant) => {
  let world: DashboardTestWorld;

  beforeEach(async () => {
    world = await createDashboardTestWorld(instant);
    await seedExampleOne(world);
    const checking = await world.bankAccount('Inter conta', 250000);
    const food = await world.category('expense', 'Comida do teste');
    const car = await world.category('expense', 'Carro do teste');
    for (const [index, cents] of [4200, 15990, 880, 31000, 12050].entries()) {
      await world.expense(checking, cents, `2026-10-${String(index * 4 + 1).padStart(2, '0')}`, {
        categoryId: index % 2 === 0 ? food : car,
      });
    }
    await world.expense(checking, 777, '2026-10-03');
    await world.expense(checking, 3000, '2026-09-12', { categoryId: food });
  });

  afterEach(async () => {
    await world.destroy();
  });

  const read = async () => {
    const request = world.at(instant);
    const today = businessDateOfInstant(instant).value;
    const month = today.slice(0, 7);
    const [free, timeline, agenda, summary, breakdown, curve, heatmap] = await Promise.all([
      world.get('/dashboard/free-balance', freeBalanceDtoSchema, request),
      world.get(`/dashboard/timeline?month=${month}`, timelineDtoSchema, request),
      world.get(`/agenda?month=${month}`, agendaDtoSchema, request),
      world.get(`/dashboard/month-summary?month=${month}`, monthSummaryDtoSchema, request),
      world.get(`/dashboard/categories?month=${month}`, categoryBreakdownDtoSchema, request),
      world.get(`/dashboard/spending-curve?month=${month}`, spendingCurveDtoSchema, request),
      world.get(
        `/dashboard/spend-heatmap?from=${month}-01&to=${today}`,
        spendHeatmapDtoSchema,
        request,
      ),
    ]);

    return { today, free, timeline, agenda, summary, breakdown, curve, heatmap };
  };

  it('Livre = balance in the accounts + what is left to receive - what is left to pay, each part the sum of its items', async () => {
    const { free } = await read();

    const sum = (items: { remainingCents: number }[]) =>
      items.reduce((total, item) => total + item.remainingCents, 0);
    expect(free.accounts.totalCents).toBe(
      free.accounts.items.reduce((total, item) => total + item.balanceCents, 0),
    );
    expect(free.receivable.totalCents).toBe(sum(free.receivable.items));
    expect(free.payable.totalCents).toBe(sum(free.payable.items));
    expect(free.freeBalanceCents).toBe(
      free.accounts.totalCents + free.receivable.totalCents - free.payable.totalCents,
    );
    expect(
      free.receivable.items.every(
        (item) => item.countsInFreeBalance && item.flow === 'in' && item.remainingCents > 0,
      ),
    ).toBe(true);
    expect(
      free.payable.items.every(
        (item) => item.countsInFreeBalance && item.flow === 'out' && item.remainingCents > 0,
      ),
    ).toBe(true);
    for (const item of [...free.receivable.items, ...free.payable.items]) {
      expect(item.remainingCents).toBe(
        Math.max(0, item.amountCents - item.paidCents - item.presumedPaidCents),
      );
    }
    expect(Number.isInteger(free.perDayCents)).toBe(true);
    expect(
      Math.abs(free.perDayCents * free.daysRemaining - free.freeBalanceCents),
    ).toBeLessThanOrEqual(free.daysRemaining);
  });

  it('the projection of the last day is the balance + what comes in - what goes out, and is the Livre', async () => {
    const { free, timeline } = await read();

    const inflow = free.receivable.items.reduce((total, item) => total + item.remainingCents, 0);
    const outflow = free.payable.items.reduce((total, item) => total + item.remainingCents, 0);
    expect(timeline.endBalanceCents).toBe(free.accounts.totalCents + inflow - outflow);
    expect(timeline.endBalanceCents).toBe(free.freeBalanceCents);
    expect(timeline.days.at(-1)?.projectedBalanceCents).toBe(free.freeBalanceCents);
    const projected = timeline.days.filter((day) => day.projectedBalanceCents !== null);
    expect(projected[0]?.date).toBe(free.asOfOn);
    expect(projected).toHaveLength(free.daysRemaining);
  });

  it('the "A pagar" of the agenda and the line "Faltam N dias" of the summary are the ones of the Livre', async () => {
    const { free, agenda, summary } = await read();

    expect(agenda.payable.totalCents).toBe(free.payable.totalCents);
    expect(agenda.payable.items).toEqual(free.payable.items);
    expect(summary.remaining).toEqual({
      daysRemaining: free.daysRemaining,
      incomingCents: free.receivable.totalCents,
      outgoingCents: free.payable.totalCents,
    });
  });

  it('the sum of the categories is the total spent, the same of the summary, of the curve and of the map', async () => {
    const { today, summary, breakdown, curve, heatmap } = await read();

    expect(breakdown.expenses.items.reduce((total, item) => total + item.spentCents, 0)).toBe(
      breakdown.expenses.totalCents,
    );
    expect(breakdown.expenses.totalCents).toBe(summary.expenses.spentCents);
    expect(breakdown.expenses.previousTotalCents).toBe(summary.expenses.previousSpentCents);
    expect(curve.days[Number(today.slice(8, 10)) - 1]?.currentCents).toBe(
      summary.expenses.spentCents,
    );
    expect(heatmap.totalCents).toBe(summary.expenses.spentCents);
    expect(heatmap.days.reduce((total, day) => total + day.totalCents, 0)).toBe(heatmap.totalCents);
  });

  it('the expected income of the categories is the one of the summary, and the received too', async () => {
    const { breakdown, summary } = await read();

    expect(breakdown.incomes.expectedCents).toBe(summary.income.expectedCents);
    expect(breakdown.incomes.receivedCents).toBe(summary.income.receivedCents);
    expect(summary.result.cents).toBe(summary.income.receivedCents - summary.expenses.spentCents);
  });

  it('is all integer cents, with no -0, in every route', async () => {
    const all = await read();
    const numbers: number[] = [];
    JSON.stringify(all, (_key, value: unknown) => {
      if (typeof value === 'number') numbers.push(value);

      return value;
    });

    expect(numbers.every((value) => Number.isFinite(value) && !Object.is(value, -0))).toBe(true);
  });
});
