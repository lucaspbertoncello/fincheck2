import {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { invoiceParamsSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import {
  createInvoicePaymentRequestSchema,
  invoicePaymentParamsSchema,
} from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';
import { Hono } from 'hono';

import type { CreateInvoicePaymentController } from '#/modules/invoices/http/invoice-payment/create-invoice-payment.controller.ts';
import type { DeleteInvoicePaymentController } from '#/modules/invoices/http/invoice-payment/delete-invoice-payment.controller.ts';
import type { DismissPaymentSuggestionController } from '#/modules/invoices/http/invoice-payment/dismiss-payment-suggestion.controller.ts';
import type { UndoPaymentSuggestionDismissalController } from '#/modules/invoices/http/invoice-payment/undo-payment-suggestion-dismissal.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The payments of an invoice and the "Não é este" of the payment found, all under the invoice of
// the card and the month.
export function createInvoicePaymentRoute(controllers: {
  createInvoicePayment: CreateInvoicePaymentController;
  deleteInvoicePayment: DeleteInvoicePaymentController;
  dismissPaymentSuggestion: DismissPaymentSuggestionController;
  undoPaymentSuggestionDismissal: UndoPaymentSuggestionDismissalController;
}) {
  return new Hono()
    .post(
      '/cards/:accountId/invoices/:month/payments',
      validateRequest('param', invoiceParamsSchema),
      validateRequest('json', createInvoicePaymentRequestSchema),
      async (c) =>
        c.json(
          await controllers.createInvoicePayment.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          201,
        ),
    )
    .delete(
      '/cards/:accountId/invoices/:month/payments/:paymentId',
      validateRequest('param', invoicePaymentParamsSchema),
      async (c) => {
        await controllers.deleteInvoicePayment.handle({ params: c.req.valid('param') });

        return c.body(null, 204);
      },
    )
    .post(
      '/cards/:accountId/invoices/:month/payment-suggestion/dismiss',
      validateRequest('param', invoiceParamsSchema),
      validateRequest('json', dismissPaymentSuggestionRequestSchema),
      async (c) =>
        c.json(
          await controllers.dismissPaymentSuggestion.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .delete(
      '/cards/:accountId/invoices/:month/payment-suggestion/dismiss',
      validateRequest('param', invoiceParamsSchema),
      validateRequest('query', dismissPaymentSuggestionQuerySchema),
      async (c) =>
        c.json(
          await controllers.undoPaymentSuggestionDismissal.handle({
            params: c.req.valid('param'),
            query: c.req.valid('query'),
          }),
          200,
        ),
    );
}
