import {
  createInstallmentPlanRequestSchema,
  listInstallmentPlansQuerySchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { Hono } from 'hono';

import type { CreateInstallmentPlanController } from '#/modules/transactions/http/installment-plan/create-installment-plan.controller.ts';
import type { ListInstallmentPlansController } from '#/modules/transactions/http/installment-plan/list-installment-plans.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The creation and the list of the plans. Both answer "the next parcel" and "what is left to pay",
// which start from the open invoice of the card, so they wait for `invoices` and `main` does not
// mount them until that context exists.
export function createInstallmentPlanRoute(controllers: {
  createInstallmentPlan: CreateInstallmentPlanController;
  listInstallmentPlans: ListInstallmentPlansController;
}) {
  return new Hono()
    .get(
      '/installment-plans',
      validateRequest('query', listInstallmentPlansQuerySchema),
      async (c) =>
        c.json(await controllers.listInstallmentPlans.handle({ query: c.req.valid('query') }), 200),
    )
    .post(
      '/installment-plans',
      validateRequest('json', createInstallmentPlanRequestSchema),
      async (c) =>
        c.json(await controllers.createInstallmentPlan.handle({ body: c.req.valid('json') }), 201),
    );
}
