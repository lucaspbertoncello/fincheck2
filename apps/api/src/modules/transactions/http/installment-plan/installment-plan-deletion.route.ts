import { Hono } from 'hono';

import type { DeleteInstallmentPlanController } from '#/modules/transactions/http/installment-plan/delete-installment-plan.controller.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// Deleting a plan depends on nothing outside `transactions`, so it is mounted already.
export function createInstallmentPlanDeletionRoute(controllers: {
  deleteInstallmentPlan: DeleteInstallmentPlanController;
}) {
  return new Hono().delete(
    '/installment-plans/:id',
    validateRequest('param', idParamSchema),
    async (c) => {
      await controllers.deleteInstallmentPlan.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    },
  );
}
