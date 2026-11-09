import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';

import type { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import { computeFreeBalance } from '#/modules/dashboard/domain/free-balance/compute-free-balance.util.ts';
import { buildTimeline } from '#/modules/dashboard/domain/timeline/build-timeline.util.ts';
import { projectBalances } from '#/modules/dashboard/domain/timeline/project-balances.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// "Até o fim do mês" of the Visão geral and "Outubro, dia a dia" of Recorrentes (BR-DSH-007, 008;
// BR-REC-005, 008, 013): the days of the month with what comes in and goes out on each, the late
// ones and the ones with no day in chips. In the current month each day from today on carries the
// projected balance (the balance today + what comes in - what goes out, up to that day) and the last
// day is the Livre; in any other month there are no balances. Both scopes carry the balances, so the
// strip of Recorrentes may use them. The controller creates the missing occurrences first.
export class GetTimelineQuery {
  private readonly loader: AgendaLoader;
  private readonly clock: Clock;

  constructor(loader: AgendaLoader, clock: Clock) {
    this.loader = loader;
    this.clock = clock;
  }

  async execute(input: GetTimelineQuery.Input): Promise<GetTimelineQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');
    const snapshot = await this.loader.load({ month, withSettled: true });
    const { today } = snapshot;

    const { days, overdue, undated } = buildTimeline({
      month,
      today,
      scope: input.scope ?? 'all',
      entries: snapshot.entries,
    });

    let endBalanceCents: number | null = null;
    if (Month.containing(today).equals(month)) {
      const opening = snapshot.accounts
        .filter((account) => !account.isArchived && account.type !== 'credit_card')
        .reduce(
          (total, account) => total.add(Money.fromCents(account.balanceCents ?? 0)),
          Money.zero(),
        );
      const livre = computeFreeBalance({
        accountsTotal: opening,
        entries: snapshot.entries,
        today,
      });
      const balances = projectBalances({ opening, movements: livre.movements, today });
      for (const day of days) day.projectedBalanceCents = balances.get(day.date)?.cents ?? null;
      endBalanceCents = balances.get(month.lastDay().value)?.cents ?? null;
    }

    return { month: month.value, today: today.value, days, overdue, undated, endBalanceCents };
  }
}

export namespace GetTimelineQuery {
  export type Input = Timeline.Query;
  export type Output = Timeline.Dto;
}
