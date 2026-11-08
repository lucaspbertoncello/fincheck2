import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// Port to the occurrences of expense recurrences on a card that are still expected and fall in an
// invoice (what is left of each, RF-INV-003). The owner is `recurrences`. The invoice month of a
// day is a rule of the cycle of the card, which `invoices` owns, so it comes in as a function: the
// reader asks where each expected day falls and keeps the ones that fall in the months asked.
export interface RecurrenceExpectationReader {
  // By invoice month: the items expected there. A month with none is absent.
  expectationsOf(
    query: {
      accountId: string;
      months: Month[];
      // The invoice (by its month) a purchase of that day falls in, with the cycle of the card.
      invoiceMonthOf: (date: BusinessDate) => Month;
    },
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
