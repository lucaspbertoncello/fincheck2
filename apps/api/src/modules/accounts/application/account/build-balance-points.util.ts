import type { BalanceHistory } from '@fincheck/shared/accounts/balance-history/balance-history.type.ts';

import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// One point per day from `first` to `last`, with the balance at the end of the day.
// Manual account: what came before the first day plus the days added up to that day.
// Pluggy account, from the back to the front: the bank balance minus what the account moved after
// that day (until today), so the point of today is the bank balance itself.
// `netByDay` holds the sum by day; for a Pluggy account it must cover `first` to today.
export function buildBalancePoints(input: {
  first: BusinessDate;
  last: BusinessDate;
  netByDay: Map<string, number>;
  kind: { source: 'manual'; openingCents: number } | { source: 'pluggy'; bankBalanceCents: number };
}): BalanceHistory.Dto['points'] {
  const total = [...input.netByDay.values()].reduce((sum, cents) => sum + cents, 0);
  const points: BalanceHistory.Dto['points'] = [];
  let cumulative = 0;

  for (let day = input.first; !input.last.isBefore(day); day = day.addDays(1)) {
    cumulative += input.netByDay.get(day.value) ?? 0;
    points.push({
      date: day.value,
      balanceCents:
        input.kind.source === 'manual'
          ? input.kind.openingCents + cumulative
          : input.kind.bankBalanceCents - (total - cumulative),
    });
  }

  return points;
}
