import {
  billParamsSchema,
  createBillRequestSchema,
  listBillsQuerySchema,
  updateBillRequestSchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import { Hono } from 'hono';

import type { CreateBillController } from '#/modules/bills/http/bill/create-bill.controller.ts';
import type { DeleteBillController } from '#/modules/bills/http/bill/delete-bill.controller.ts';
import type { GetBillController } from '#/modules/bills/http/bill/get-bill.controller.ts';
import type { ListBillCounterpartiesController } from '#/modules/bills/http/bill/list-bill-counterparties.controller.ts';
import type { ListBillsController } from '#/modules/bills/http/bill/list-bills.controller.ts';
import type { UpdateBillController } from '#/modules/bills/http/bill/update-bill.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The bills and debts. `/bills/counterparties` is registered before `/bills/:id`; the other fixed
// path (`/bills/payment-candidates`) lives in `createBillPaymentRoute`, which is mounted first.
export function createBillRoute(controllers: {
  listBills: ListBillsController;
  listBillCounterparties: ListBillCounterpartiesController;
  getBill: GetBillController;
  createBill: CreateBillController;
  updateBill: UpdateBillController;
  deleteBill: DeleteBillController;
}) {
  return new Hono()
    .get('/bills', validateRequest('query', listBillsQuerySchema), async (c) =>
      c.json(await controllers.listBills.handle({ query: c.req.valid('query') }), 200),
    )
    .get('/bills/counterparties', async (c) =>
      c.json(await controllers.listBillCounterparties.handle(), 200),
    )
    .get('/bills/:id', validateRequest('param', billParamsSchema), async (c) =>
      c.json(await controllers.getBill.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/bills', validateRequest('json', createBillRequestSchema), async (c) =>
      c.json(await controllers.createBill.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/bills/:id',
      validateRequest('param', billParamsSchema),
      validateRequest('json', updateBillRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateBill.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .delete('/bills/:id', validateRequest('param', billParamsSchema), async (c) => {
      await controllers.deleteBill.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    });
}
