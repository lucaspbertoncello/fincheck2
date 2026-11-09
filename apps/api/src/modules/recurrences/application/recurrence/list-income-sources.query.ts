import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { computeNextExpectedOn } from '#/modules/recurrences/domain/recurrence/compute-next-expected-on.util.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The active income recurrences (neither paused nor archived) with the next day each one is
// expected: the sources of income of the profile (BR-PRF-002). `profile` asks it through its
// `ProfileIncomeSourceReader`, which this class satisfies. The order is the profile's to decide.
export class ListIncomeSourcesQuery {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly calendar: BusinessCalendar;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    calendar: BusinessCalendar,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.calendar = calendar;
    this.clock = clock;
  }

  async listIncomeSources(): Promise<ListIncomeSourcesQuery.IncomeSource[]> {
    const today = this.clock.today();
    const active = await this.recurrences.findActive();

    return active
      .filter((recurrence) => recurrence.kind === 'income')
      .map((recurrence) => ({
        recurrenceId: recurrence.id,
        name: recurrence.name,
        counterparty: recurrence.counterparty,
        employmentRegime: recurrence.employmentRegime,
        expectedAmountCents: recurrence.expectedAmount.cents,
        amountMode: recurrence.amountMode,
        dateRule: recurrence.dateRule.toDto(),
        accountId: recurrence.accountId,
        nextExpectedOn:
          computeNextExpectedOn(recurrence.dateRule, recurrence.startsMonth, today, this.calendar)
            ?.value ?? null,
      }));
  }
}

export namespace ListIncomeSourcesQuery {
  export type IncomeSource = {
    recurrenceId: string;
    name: string;
    counterparty: string | null;
    employmentRegime: RecurrenceContract.EmploymentRegime | null;
    expectedAmountCents: number;
    amountMode: RecurrenceContract.AmountMode;
    dateRule: RecurrenceContract.DateRule;
    accountId: string | null;
    // Today or later; null when the rule has no day.
    nextExpectedOn: string | null;
  };
}
