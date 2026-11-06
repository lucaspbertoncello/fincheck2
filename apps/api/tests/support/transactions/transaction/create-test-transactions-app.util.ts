import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { createTransactionsModule } from '#/main/http/create-transactions-module.util.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { createTestCategoryReader } from '#tests/support/categories/category/create-test-category-reader.util.ts';
import { createTestTagReader } from '#tests/support/categories/tag/create-test-tag-reader.util.ts';
import { createTestInvoiceMonthReader } from '#tests/support/invoices/invoice/create-test-invoice-month-reader.util.ts';
import { createTestOpenInvoiceMonthReader } from '#tests/support/invoices/invoice/create-test-open-invoice-month-reader.util.ts';

type Module = ReturnType<typeof createTransactionsModule>;
type Readers = NonNullable<Parameters<typeof createTransactionsModule>[0]['readers']>;

// The `transactions` module with the readers of the owners that do not exist yet standing in as
// test doubles that read their tables, and with EVERY route mounted, the ones `main` leaves out
// included (bulk and installment plans). `readers` replaces or adds a reader. The returned `module`
// has the ports `accounts` asks for.
export function createTransactionsTestApp(
  db: Kysely<Database>,
  options: { clock: Clock; readers?: Readers; withoutOwners?: boolean },
): { app: Hono; module: Module } {
  const owners: Readers = options.withoutOwners
    ? {}
    : {
        categories: createTestCategoryReader(db),
        tags: createTestTagReader(db),
        invoiceMonths: createTestInvoiceMonthReader(db),
        openInvoiceMonths: createTestOpenInvoiceMonthReader('2026-11'),
        categoryRules: {
          async existingRuleIds(ruleIds, executor = db) {
            const rows = await executor
              .selectFrom('category_rules')
              .select('id')
              .where('id', 'in', ruleIds.length > 0 ? ruleIds : [''])
              .execute();

            return new Set(rows.map((row) => row.id));
          },
        },
      };
  const module = createTransactionsModule({
    db,
    unitOfWork: new KyselyUnitOfWork(db),
    clock: options.clock,
    accounts: new GetAccountRefQuery(new KyselyAccountRepository(db)),
    readers: { ...owners, ...options.readers },
  });

  const app = new Hono().onError(handleError);
  app.route('/', module.routes);
  if (module.bulkRoute) app.route('/', module.bulkRoute);
  if (module.installmentPlanRoute) app.route('/', module.installmentPlanRoute);

  return { app, module };
}
