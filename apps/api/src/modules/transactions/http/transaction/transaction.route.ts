import {
  createTransactionRequestSchema,
  listTransactionsQuerySchema,
  resolveBankChangeRequestSchema,
  splitTransactionRequestSchema,
  updateTransactionRequestSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { reviewQueueQuerySchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { transactionSummaryQuerySchema } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import { Hono } from 'hono';

import type { CreateTransactionController } from '#/modules/transactions/http/transaction/create-transaction.controller.ts';
import type { DeleteTransactionController } from '#/modules/transactions/http/transaction/delete-transaction.controller.ts';
import type { GetReviewQueueController } from '#/modules/transactions/http/transaction/get-review-queue.controller.ts';
import type { GetTransactionController } from '#/modules/transactions/http/transaction/get-transaction.controller.ts';
import type { GetTransactionSummaryController } from '#/modules/transactions/http/transaction/get-transaction-summary.controller.ts';
import type { IgnoreTransactionController } from '#/modules/transactions/http/transaction/ignore-transaction.controller.ts';
import type { ListTransactionsController } from '#/modules/transactions/http/transaction/list-transactions.controller.ts';
import type { ResolveBankChangeController } from '#/modules/transactions/http/transaction/resolve-bank-change.controller.ts';
import type { RestoreOriginalController } from '#/modules/transactions/http/transaction/restore-original.controller.ts';
import type { SplitTransactionController } from '#/modules/transactions/http/transaction/split-transaction.controller.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import type { UnignoreTransactionController } from '#/modules/transactions/http/transaction/unignore-transaction.controller.ts';
import type { UnsplitTransactionController } from '#/modules/transactions/http/transaction/unsplit-transaction.controller.ts';
import type { UpdateTransactionController } from '#/modules/transactions/http/transaction/update-transaction.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The routes of a transaction that work with the contexts built so far. `/summary` and
// `/review-queue` come before `/:id`: Hono answers with the first route that matches.
export function createTransactionRoute(controllers: {
  listTransactions: ListTransactionsController;
  getTransactionSummary: GetTransactionSummaryController;
  getReviewQueue: GetReviewQueueController;
  getTransaction: GetTransactionController;
  createTransaction: CreateTransactionController;
  updateTransaction: UpdateTransactionController;
  deleteTransaction: DeleteTransactionController;
  restoreOriginal: RestoreOriginalController;
  resolveBankChange: ResolveBankChangeController;
  ignoreTransaction: IgnoreTransactionController;
  unignoreTransaction: UnignoreTransactionController;
  splitTransaction: SplitTransactionController;
  unsplitTransaction: UnsplitTransactionController;
}) {
  return new Hono()
    .get('/transactions', validateRequest('query', listTransactionsQuerySchema), async (c) =>
      c.json(await controllers.listTransactions.handle({ query: c.req.valid('query') }), 200),
    )
    .get(
      '/transactions/summary',
      validateRequest('query', transactionSummaryQuerySchema),
      async (c) =>
        c.json(
          await controllers.getTransactionSummary.handle({ query: c.req.valid('query') }),
          200,
        ),
    )
    .get(
      '/transactions/review-queue',
      validateRequest('query', reviewQueueQuerySchema),
      async (c) =>
        c.json(await controllers.getReviewQueue.handle({ query: c.req.valid('query') }), 200),
    )
    .get('/transactions/:id', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.getTransaction.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/transactions', validateRequest('json', createTransactionRequestSchema), async (c) =>
      c.json(await controllers.createTransaction.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/transactions/:id',
      validateRequest('param', idParamSchema),
      validateRequest('json', updateTransactionRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateTransaction.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .delete('/transactions/:id', validateRequest('param', idParamSchema), async (c) => {
      await controllers.deleteTransaction.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    })
    .post(
      '/transactions/:id/restore-original',
      validateRequest('param', idParamSchema),
      async (c) =>
        c.json(await controllers.restoreOriginal.handle({ params: c.req.valid('param') }), 200),
    )
    .post(
      '/transactions/:id/bank-change/resolve',
      validateRequest('param', idParamSchema),
      validateRequest('json', resolveBankChangeRequestSchema),
      async (c) =>
        c.json(
          await controllers.resolveBankChange.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/transactions/:id/ignore', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.ignoreTransaction.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/transactions/:id/unignore', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.unignoreTransaction.handle({ params: c.req.valid('param') }), 200),
    )
    .put(
      '/transactions/:id/splits',
      validateRequest('param', idParamSchema),
      validateRequest('json', splitTransactionRequestSchema),
      async (c) =>
        c.json(
          await controllers.splitTransaction.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .delete('/transactions/:id/splits', validateRequest('param', idParamSchema), async (c) =>
      c.json(await controllers.unsplitTransaction.handle({ params: c.req.valid('param') }), 200),
    );
}
