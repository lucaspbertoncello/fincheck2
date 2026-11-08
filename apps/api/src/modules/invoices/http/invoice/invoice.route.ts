import {
  invoiceParamsSchema,
  listInvoicesQuerySchema,
  updateInvoiceRequestSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { Hono } from 'hono';

import type { GetInvoiceController } from '#/modules/invoices/http/invoice/get-invoice.controller.ts';
import type { ListInvoicesController } from '#/modules/invoices/http/invoice/list-invoices.controller.ts';
import type { ListOpenInvoicesController } from '#/modules/invoices/http/invoice/list-open-invoices.controller.ts';
import type { UpdateInvoiceController } from '#/modules/invoices/http/invoice/update-invoice.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The invoice is addressed by the card and the month of its closing (`/cards/:accountId/invoices/
// :month`), never by an id. The month of an invoice nobody wrote on is calculated, not stored.
export function createInvoiceRoute(controllers: {
  listOpenInvoices: ListOpenInvoicesController;
  listInvoices: ListInvoicesController;
  getInvoice: GetInvoiceController;
  updateInvoice: UpdateInvoiceController;
}) {
  return new Hono()
    .get('/invoices/open', async (c) => c.json(await controllers.listOpenInvoices.handle(), 200))
    .get(
      '/cards/:accountId/invoices',
      validateRequest('param', invoiceParamsSchema.pick({ accountId: true })),
      validateRequest('query', listInvoicesQuerySchema),
      async (c) =>
        c.json(
          await controllers.listInvoices.handle({
            params: c.req.valid('param'),
            query: c.req.valid('query'),
          }),
          200,
        ),
    )
    .get(
      '/cards/:accountId/invoices/:month',
      validateRequest('param', invoiceParamsSchema),
      async (c) =>
        c.json(await controllers.getInvoice.handle({ params: c.req.valid('param') }), 200),
    )
    .patch(
      '/cards/:accountId/invoices/:month',
      validateRequest('param', invoiceParamsSchema),
      validateRequest('json', updateInvoiceRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateInvoice.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    );
}
