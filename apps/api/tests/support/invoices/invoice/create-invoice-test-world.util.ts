import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { expect } from 'vitest';

import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const INVOICE_TEST_NOW = '2026-11-06T15:00:00.000Z';

// The API as `main` builds it, over a SQLite file, with a clock stopped at `instant` (by default
// 06/11/2026 12:00 in São Paulo), a card that closes on the 5th and is due on the 12th (the open
// invoice is then `2026-12`, and `2026-11` is already closed) and a checking account. `at` builds
// another app over the same database with another clock.
export async function createInvoiceTestWorld(instant: string = INVOICE_TEST_NOW) {
  const database = await createTestDatabase();
  const card = await insertTestCreditCard(database.db);
  const checking = await insertTestAccount(database.db, { name: 'Conta corrente' });

  const app = createTestApp(database.db, { clock: createFixedClock(instant) });
  const sender = (clockInstant: string) => {
    const app = createTestApp(database.db, { clock: createFixedClock(clockInstant) });

    return (method: string, path: string, body?: unknown) =>
      app.request(path, {
        method,
        ...(body === undefined
          ? {}
          : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
      });
  };

  return {
    database,
    card,
    checking,
    app,
    send: sender(instant),
    at: sender,
    invoiceOf: async (response: Response, status = 200) => {
      expect(response.status).toBe(status);

      return invoiceDtoSchema.parse(await response.json());
    },
    detailOf: async (response: Response, status = 200) => {
      expect(response.status).toBe(status);

      return invoiceDetailDtoSchema.parse(await response.json());
    },
    transactionOf: async (response: Response, status = 200) => {
      expect(response.status).toBe(status);

      return transactionDtoSchema.parse(await response.json());
    },
    expectError: async (response: Response, status: number, code: string) => {
      expect(response.status).toBe(status);
      expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
    },
  };
}
