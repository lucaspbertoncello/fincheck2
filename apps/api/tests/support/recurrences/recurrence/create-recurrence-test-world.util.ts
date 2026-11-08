import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { occurrenceDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import {
  createRecurrenceResponseSchema,
  recurrenceDtoSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { createRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { expect } from 'vitest';
import type { z } from 'zod';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

// 22/10/2026 12:00 in São Paulo (the day of the screen the contract uses as example).
const RECURRENCE_TEST_NOW = '2026-10-22T15:00:00.000Z';

// What a test may send to `POST /recurrences`: the input of the schema, so the date rule may leave out
// the fields it does not use.
export type RecurrenceRequestInput = z.input<typeof createRecurrenceRequestSchema>;

// A body of `POST /recurrences` that is valid: an expense on the 10th, R$ 109,90, from October. Each test changes
// what it is about.
export function buildRecurrenceRequest(
  overrides: Partial<RecurrenceRequestInput> = {},
): Record<string, unknown> {
  return {
    kind: 'expense',
    name: 'Academia',
    expectedAmountCents: 10990,
    dateRule: { type: 'fixed_day', day: 10 },
    // The first month is given, so the 10th of an October that is at the 22nd still starts in
    // October (born late). Left out, the recurrence of a day that has passed starts next month.
    startsMonth: '2026-10',
    ...overrides,
  };
}

// The API as `main` builds it, over a SQLite file, with a clock stopped at `instant` (by default
// 22/10/2026), a checking account and a card that closes on the 5th and is due on the 12th (so the
// invoice that is open today is `2026-11`). `at` builds another app over the same database with
// another clock.
export async function createRecurrenceTestWorld(instant: string = RECURRENCE_TEST_NOW) {
  const database = await createTestDatabase();
  const checking = await insertTestAccount(database.db, { name: 'Conta corrente' });
  const card = await insertTestCreditCard(database.db);

  const sender = (clockInstant: string) => {
    const app = createTestApp(database.db, { clock: createFixedClock(clockInstant) });

    return (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
      app.request(path, {
        method,
        ...(body === undefined
          ? { headers }
          : {
              headers: { 'content-type': 'application/json', ...headers },
              body: JSON.stringify(body),
            }),
      });
  };
  const send = sender(instant);

  return {
    database,
    checking,
    card,
    send,
    at: sender,
    // POSTs a recurrence and answers its two parts.
    create: async (
      overrides: Partial<RecurrenceRequestInput> = {},
      request: typeof send = send,
    ) => {
      const response = await request('POST', '/recurrences', buildRecurrenceRequest(overrides));
      expect(response.status).toBe(201);

      return createRecurrenceResponseSchema.parse(await response.json());
    },
    recurrenceOf: async (response: Response, status = 200) => {
      expect(response.status).toBe(status);

      return recurrenceDtoSchema.parse(await response.json());
    },
    occurrenceOf: async (response: Response, status = 200): Promise<Occurrence.Dto> => {
      expect(response.status).toBe(status);

      return occurrenceDtoSchema.parse(await response.json());
    },
    expectError: async (response: Response, status: number, code: string) => {
      expect(response.status).toBe(status);
      expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
    },
  };
}
