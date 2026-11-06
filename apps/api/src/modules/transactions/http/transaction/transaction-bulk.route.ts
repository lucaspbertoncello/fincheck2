import {
  bulkTransactionsRequestSchema,
  restoreBulkRequestSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { Hono } from 'hono';

import type { BulkTransactionsController } from '#/modules/transactions/http/transaction/bulk-transactions.controller.ts';
import type { RestoreBulkTransactionsController } from '#/modules/transactions/http/transaction/restore-bulk-transactions.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The selection mode and its "Desfazer". They wait for `categories` (the category, the tag and the
// rules they write), so `main` does not mount them until that context exists.
export function createTransactionBulkRoute(controllers: {
  bulkTransactions: BulkTransactionsController;
  restoreBulkTransactions: RestoreBulkTransactionsController;
}) {
  return new Hono()
    .post('/transactions/bulk', validateRequest('json', bulkTransactionsRequestSchema), async (c) =>
      c.json(await controllers.bulkTransactions.handle({ body: c.req.valid('json') }), 200),
    )
    .post(
      '/transactions/bulk/restore',
      validateRequest('json', restoreBulkRequestSchema),
      async (c) =>
        c.json(
          await controllers.restoreBulkTransactions.handle({ body: c.req.valid('json') }),
          200,
        ),
    );
}
