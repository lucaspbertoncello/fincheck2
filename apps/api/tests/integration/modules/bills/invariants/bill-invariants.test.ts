import { billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createBillsTestWorld,
  type BillsTestWorld,
} from '#tests/support/bills/bill/create-bills-test-world.util.ts';

let world: BillsTestWorld;

beforeEach(async () => {
  world = await createBillsTestWorld();
});

afterEach(async () => {
  await world.destroy();
});

// A small deterministic generator (mulberry32), so the same seed always plays the same game.
function random(seed: number) {
  let state = seed;

  return (below: number) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * below);
  };
}

async function listAll(): Promise<Bill.Dto[]> {
  const response = await world.send('GET', '/bills?status=all');

  return ((await response.json()) as { items: unknown[] }).items.map((item) =>
    billDtoSchema.parse(item),
  );
}

function expectConsistent(bill: Bill.Dto, today: string) {
  const summed = bill.payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  expect(Number.isInteger(bill.amountCents)).toBe(true);
  expect(Number.isInteger(bill.paidCents)).toBe(true);
  expect(bill.paidCents).toBe(summed);
  expect(bill.paidCents).toBeGreaterThanOrEqual(0);
  expect(bill.paidCents).toBeLessThanOrEqual(bill.amountCents);
  expect(bill.remainingCents).toBe(bill.amountCents - bill.paidCents);
  if (bill.paidCents === bill.amountCents) expect(bill.status).toBe('settled');
  else if (bill.dueOn !== null && today > bill.dueOn) expect(bill.status).toBe('overdue');
  else expect(bill.status).toBe(bill.paidCents > 0 ? 'partial' : 'open');
}

describe('invariants of the bills', () => {
  it.each([1, 7, 42, 20261108])(
    'seed %i: through payments, ignoring, unignoring and editing the value, the paid amount is the sum of the payments, never passes the value, and the status follows it',
    async (seed) => {
      const next = random(seed);
      const dueOptions = [null, '2026-10-20', '2026-11-06', '2026-12-01'];
      const bills: Bill.Dto[] = [];
      const linked: { transactionId: string; billId: string }[] = [];

      for (let step = 0; step < 60; step += 1) {
        const action = next(7);

        if (action === 0 || bills.length === 0) {
          const friend = next(2) === 0;
          const receivable = next(2) === 0;
          const dueOn = dueOptions[next(4)];
          bills.push(
            await world.bill({
              direction: receivable ? 'receivable' : 'payable',
              kind: friend ? 'friend' : 'general',
              ...(friend ? { counterparty: 'Rafa' } : {}),
              amountCents: 100 + next(90000),
              ...(dueOn ? { dueOn } : {}),
            }),
          );
        } else if (action === 1) {
          // Half the time on a bill that has a transaction tied to it, for what is missing now.
          const target = linked[next(Math.max(linked.length, 1))];
          const bill = target && next(2) === 0 ? { id: target.billId } : bills[next(bills.length)];
          const [fresh] = (await listAll()).filter((candidate) => candidate.id === bill?.id);
          await world.send('POST', `/bills/${bill?.id}/payments`, {
            amountCents:
              next(2) === 0 ? fresh?.remainingCents || 1 : 1 + next(fresh?.amountCents ?? 1),
            paidOn: '2026-11-02',
          });
        } else if (action === 2) {
          const bill = bills[next(bills.length)];
          const cents = next(2) === 0 ? (bill?.amountCents ?? 1) : 1 + next(bill?.amountCents ?? 1);
          const transactionId =
            bill?.direction === 'receivable'
              ? await world.income(cents, '2026-11-03')
              : await world.expense(cents, '2026-11-03');
          const response = await world.send('POST', `/bills/${bill?.id}/payments`, {
            transactionId,
          });
          if (response.status === 201 && bill) linked.push({ transactionId, billId: bill.id });
        } else if (action === 3) {
          const current = await listAll();
          const withPayment = current.filter((bill) => bill.payments.length > 0);
          const bill = withPayment[next(Math.max(withPayment.length, 1))];
          if (bill) {
            await world.send('DELETE', `/bills/${bill.id}/payments/${bill.payments[0]?.id}`);
          }
        } else if (action === 4 || action === 5) {
          const target = linked[next(Math.max(linked.length, 1))];
          if (target) {
            await world.send(
              'POST',
              `/transactions/${target.transactionId}/${action === 4 ? 'ignore' : 'unignore'}`,
            );
          }
        } else {
          const bill = bills[next(bills.length)];
          await world.send('PATCH', `/bills/${bill?.id}`, { amountCents: 100 + next(90000) });
        }

        for (const bill of await listAll()) expectConsistent(bill, '2026-11-06');
      }
    },
  );

  it('the money that came back from a friend never counts as income again once reimbursed', async () => {
    const pix = await world.income(5800, '2026-11-04');
    const bill = await world.bill({
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Júlia',
      amountCents: 11600,
    });

    await world.send('POST', `/bills/${bill.id}/payments`, { transactionId: pix });
    const row = await world.transaction(pix);

    expect(['expense', 'income']).not.toContain(row.nature);
    expect(row.nature).toBe('reimbursed');
  });
});
