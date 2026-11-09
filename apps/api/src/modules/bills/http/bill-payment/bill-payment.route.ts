import {
  billParamsSchema,
  listBillPaymentCandidatesQuerySchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import {
  billPaymentParamsSchema,
  createBillPaymentRequestSchema,
} from '@fincheck/shared/bills/bill-payment/bill-payment.schema.ts';
import {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { Hono } from 'hono';

import type { CreateBillPaymentController } from '#/modules/bills/http/bill-payment/create-bill-payment.controller.ts';
import type { DeleteBillPaymentController } from '#/modules/bills/http/bill-payment/delete-bill-payment.controller.ts';
import type { DismissBillPaymentSuggestionController } from '#/modules/bills/http/bill-payment/dismiss-payment-suggestion.controller.ts';
import type { ListBillPaymentCandidatesController } from '#/modules/bills/http/bill-payment/list-bill-payment-candidates.controller.ts';
import type { ListNewBillPaymentCandidatesController } from '#/modules/bills/http/bill-payment/list-new-bill-payment-candidates.controller.ts';
import type { UndoBillPaymentSuggestionDismissalController } from '#/modules/bills/http/bill-payment/undo-bill-payment-suggestion-dismissal.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The payments of a bill, the transactions to pick them from and the "Não é este" of the payment
// found. Mount it before `createBillRoute`: `/bills/payment-candidates` must win over `/bills/:id`.
export function createBillPaymentRoute(controllers: {
  listNewBillPaymentCandidates: ListNewBillPaymentCandidatesController;
  listBillPaymentCandidates: ListBillPaymentCandidatesController;
  createBillPayment: CreateBillPaymentController;
  deleteBillPayment: DeleteBillPaymentController;
  dismissBillPaymentSuggestion: DismissBillPaymentSuggestionController;
  undoBillPaymentSuggestionDismissal: UndoBillPaymentSuggestionDismissalController;
}) {
  return new Hono()
    .get(
      '/bills/payment-candidates',
      validateRequest('query', listBillPaymentCandidatesQuerySchema),
      async (c) =>
        c.json(
          await controllers.listNewBillPaymentCandidates.handle({ query: c.req.valid('query') }),
          200,
        ),
    )
    .get('/bills/:id/payment-candidates', validateRequest('param', billParamsSchema), async (c) =>
      c.json(
        await controllers.listBillPaymentCandidates.handle({ params: c.req.valid('param') }),
        200,
      ),
    )
    .post(
      '/bills/:id/payments',
      validateRequest('param', billParamsSchema),
      validateRequest('json', createBillPaymentRequestSchema),
      async (c) =>
        c.json(
          await controllers.createBillPayment.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          201,
        ),
    )
    .delete(
      '/bills/:id/payments/:paymentId',
      validateRequest('param', billPaymentParamsSchema),
      async (c) => {
        await controllers.deleteBillPayment.handle({ params: c.req.valid('param') });

        return c.body(null, 204);
      },
    )
    .post(
      '/bills/:id/payment-suggestion/dismiss',
      validateRequest('param', billParamsSchema),
      validateRequest('json', dismissPaymentSuggestionRequestSchema),
      async (c) =>
        c.json(
          await controllers.dismissBillPaymentSuggestion.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .delete(
      '/bills/:id/payment-suggestion/dismiss',
      validateRequest('param', billParamsSchema),
      validateRequest('query', dismissPaymentSuggestionQuerySchema),
      async (c) =>
        c.json(
          await controllers.undoBillPaymentSuggestionDismissal.handle({
            params: c.req.valid('param'),
            query: c.req.valid('query'),
          }),
          200,
        ),
    );
}
