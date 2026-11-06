import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// Port to the movement of an account day by day, for the balance curve. It counts the transactions
// that are not ignored and that the bank did not remove. The owner is `transactions`.
export interface AccountMovementReader {
  // The sum of the transactions dated up to `upTo`, inclusive.
  netUntil(accountId: string, upTo: BusinessDate, executor?: Kysely<Database>): Promise<number>;
  // The sum by day (`YYYY-MM-DD`) in the range, inclusive; a day with no movement is absent.
  netByDay(
    accountId: string,
    from: BusinessDate,
    to: BusinessDate,
    executor?: Kysely<Database>,
  ): Promise<Map<string, number>>;
}
