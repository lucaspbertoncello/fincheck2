import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the occurrences of expense recurrences on a card that are still expected and fall in an
// invoice (what is left of each, RF-INV-003). The owner is `recurrences`, which does not exist yet:
// while the `main` leaves it unwired, no invoice has an expected recurrence.
export interface RecurrenceExpectationReader {
  // By invoice month: the items expected there. A month with none is absent.
  expectationsOf(
    accountId: string,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, RecurrenceExpectationReader.Expectation[]>>;
}

export namespace RecurrenceExpectationReader {
  export type Expectation = {
    occurrenceId: string;
    recurrenceName: string;
    expectedOn: string | null;
    // What is left of the occurrence. Positive.
    amountCents: number;
  };
}
