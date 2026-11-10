import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

/** Who owes whom once the open debts with one person are netted. */
export type FriendStance = 'owes-me' | 'i-owe' | 'even';

export type FriendBalance = {
  /** The person without case or accents: "JULIA" groups "Júlia" and "julia". */
  key: string;
  /** How the person is written in the latest debt. */
  name: string;
  /** What is left on the open debts, in cents: positive when the person owes you, negative when you owe. */
  balanceCents: number;
  stance: FriendStance;
  openCount: number;
  /** The open debts first (due date, no date last), then the settled ones (latest first). */
  debts: Bill.Dto[];
};

function compareOpen(a: Bill.Dto, b: Bill.Dto): number {
  if (a.dueOn !== b.dueOn) {
    if (a.dueOn === null) return 1;
    if (b.dueOn === null) return -1;
    return a.dueOn.localeCompare(b.dueOn);
  }

  return a.createdAt.localeCompare(b.createdAt);
}

function sortDebts(debts: readonly Bill.Dto[]): Bill.Dto[] {
  const open = debts.filter((debt) => debt.status !== 'settled').sort(compareOpen);
  const settled = debts
    .filter((debt) => debt.status === 'settled')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return [...open, ...settled];
}

/**
 * The balance of each person you have friend debts with. The open debts add up with a sign (what
 * the person owes you counts +, what you owe counts −) over what is still left of each; settled
 * debts weigh nothing. A person with nothing open is "even" ("quite"). The people come by the size
 * of the balance, whichever way it points, and the even ones last.
 */
export function computeFriendBalances(bills: readonly Bill.Dto[]): FriendBalance[] {
  const groups = new Map<string, Bill.Dto[]>();
  for (const bill of bills) {
    if (bill.kind !== 'friend' || !bill.counterparty) continue;
    const key = normalizeText(bill.counterparty);
    groups.set(key, [...(groups.get(key) ?? []), bill]);
  }

  const people = [...groups].map(([key, debts]): FriendBalance => {
    const open = debts.filter((debt) => debt.status !== 'settled');
    const balanceCents = open.reduce(
      (sum, debt) => sum + (debt.direction === 'receivable' ? 1 : -1) * debt.remainingCents,
      0,
    );
    const latest = debts.reduce((a, b) => (b.createdAt.localeCompare(a.createdAt) >= 0 ? b : a));

    return {
      key,
      name: latest.counterparty ?? key,
      balanceCents,
      stance: balanceCents > 0 ? 'owes-me' : balanceCents < 0 ? 'i-owe' : 'even',
      openCount: open.length,
      debts: sortDebts(debts),
    };
  });

  return people.sort(
    (a, b) =>
      Math.abs(b.balanceCents) - Math.abs(a.balanceCents) || a.name.localeCompare(b.name, 'pt-BR'),
  );
}
