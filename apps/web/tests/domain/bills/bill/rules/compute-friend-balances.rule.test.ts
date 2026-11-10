import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { describe, expect, it } from 'vitest';

import { computeFriendBalances } from '#/domain/bills/bill/rules/compute-friend-balances.rule.ts';

let counter = 0;

function debt(patch: Partial<Bill.Dto> = {}): Bill.Dto {
  counter += 1;
  const amountCents = patch.amountCents ?? 10_000;
  const paidCents = patch.paidCents ?? 0;
  const stamp = `2026-11-0${(counter % 9) + 1}T12:00:00.000Z`;

  return {
    id: `bill-${counter}`,
    direction: 'receivable',
    kind: 'friend',
    description: 'Jantar',
    counterparty: 'Júlia',
    amountCents,
    paidCents,
    remainingCents: amountCents - paidCents,
    dueOn: null,
    categoryId: null,
    status: paidCents > 0 ? 'partial' : 'open',
    origin: null,
    payments: [],
    createdAt: stamp,
    updatedAt: stamp,
    ...patch,
  };
}

describe('computeFriendBalances', () => {
  it('adds what is left of the open debts, + when the person owes you and − when you owe', () => {
    const [rafa] = computeFriendBalances([
      debt({ counterparty: 'Rafa', direction: 'payable', amountCents: 42_000, paidCents: 15_000 }),
      debt({ counterparty: 'Rafa', direction: 'receivable', amountCents: 10_000 }),
    ]);

    expect(rafa).toMatchObject({ name: 'Rafa', balanceCents: -17_000, stance: 'i-owe' });
    expect(rafa?.openCount).toBe(2);
  });

  it('says the person owes you when the balance is positive', () => {
    const [julia] = computeFriendBalances([
      debt({ amountCents: 11_600, paidCents: 5_800 }),
      debt({ direction: 'payable', amountCents: 1_000 }),
    ]);

    expect(julia).toMatchObject({ balanceCents: 4_800, stance: 'owes-me' });
  });

  it('is even when the open debts cancel out, and when only settled debts are left', () => {
    const cancelled = computeFriendBalances([
      debt({ counterparty: 'Bia', amountCents: 5_000 }),
      debt({ counterparty: 'Bia', direction: 'payable', amountCents: 5_000 }),
    ]);
    const settled = computeFriendBalances([
      debt({ counterparty: 'Gu', paidCents: 3_000, amountCents: 3_000, status: 'settled' }),
    ]);

    expect(cancelled[0]).toMatchObject({ balanceCents: 0, stance: 'even', openCount: 2 });
    expect(settled[0]).toMatchObject({ balanceCents: 0, stance: 'even', openCount: 0 });
  });

  it('weighs a settled debt as nothing', () => {
    const [julia] = computeFriendBalances([
      debt({ amountCents: 9_000, paidCents: 9_000, status: 'settled' }),
      debt({ amountCents: 2_000 }),
    ]);

    expect(julia?.balanceCents).toBe(2_000);
    expect(julia?.openCount).toBe(1);
  });

  it('groups the same person whatever the case or the accents', () => {
    const people = computeFriendBalances([
      debt({ counterparty: 'julia', createdAt: '2026-11-01T12:00:00.000Z' }),
      debt({ counterparty: 'Júlia', createdAt: '2026-11-02T12:00:00.000Z' }),
    ]);

    expect(people).toHaveLength(1);
    expect(people[0]?.name).toBe('Júlia');
    expect(people[0]?.debts).toHaveLength(2);
  });

  it('ignores bills that are not friend debts', () => {
    expect(
      computeFriendBalances([
        debt({ kind: 'general', counterparty: 'Marina' }),
        debt({ counterparty: null }),
      ]),
    ).toEqual([]);
  });

  it('orders the people by the size of the balance, either way, with the even ones last', () => {
    const people = computeFriendBalances([
      debt({ counterparty: 'Ana', amountCents: 1_000 }),
      debt({ counterparty: 'Bia', amountCents: 5_000, status: 'settled', paidCents: 5_000 }),
      debt({ counterparty: 'Caio', direction: 'payable', amountCents: 9_000 }),
      debt({ counterparty: 'Davi', amountCents: 3_000 }),
    ]);

    expect(people.map((person) => person.name)).toEqual(['Caio', 'Davi', 'Ana', 'Bia']);
  });

  it('puts the open debts first by due date (no date last) and the settled ones after', () => {
    const [julia] = computeFriendBalances([
      debt({ description: 'sem data' }),
      debt({ description: 'quitada', amountCents: 500, paidCents: 500, status: 'settled' }),
      debt({ description: 'depois', dueOn: '2026-12-20' }),
      debt({ description: 'antes', dueOn: '2026-12-05' }),
    ]);

    expect(julia?.debts.map((item) => item.description)).toEqual([
      'antes',
      'depois',
      'sem data',
      'quitada',
    ]);
  });
});
