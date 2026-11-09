import { computeLandingDate } from '#/modules/dashboard/domain/timeline/compute-landing-date.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The projected balance of each day from today to the end of the month (BR-DSH-008):
//
//   projected(d) = balance in the accounts today + what comes in up to d - what goes out up to d
//
// `movements` are what the Livre counts (signed cents and their due day). The last day is the Livre
// (`opening` plus every movement). Days before today have no projection and are not in the map.
export function projectBalances(input: {
  opening: Money;
  movements: { dueOn: string | null; cents: number }[];
  today: BusinessDate;
}): Map<string, Money> {
  const lastDay = Month.containing(input.today).lastDay();
  const byDay = new Map<string, number>();
  for (const movement of input.movements) {
    const day = computeLandingDate(movement.dueOn, input.today, lastDay);
    byDay.set(day, (byDay.get(day) ?? 0) + movement.cents);
  }

  const balances = new Map<string, Money>();
  let balance = input.opening;
  for (let day = input.today; !lastDay.isBefore(day); day = day.addDays(1)) {
    balance = balance.add(Money.fromCents(byDay.get(day.value) ?? 0));
    balances.set(day.value, balance);
  }

  return balances;
}
