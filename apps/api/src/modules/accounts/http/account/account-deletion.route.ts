import { Hono } from 'hono';

import { accountIdParamSchema } from '#/modules/accounts/http/account/account-id-param.schema.ts';
import type { DeleteAccountController } from '#/modules/accounts/http/account/delete-account.controller.ts';
import type { GetDeletionImpactController } from '#/modules/accounts/http/account/get-deletion-impact.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The routes that wait for `transactions`, `invoices` and `categories` (what the deletion takes
// with it). Not mounted in `main` until those contexts exist: see "a ligar" in the report of piece 2.
export function createAccountDeletionRoute(controllers: {
  getDeletionImpact: GetDeletionImpactController;
  deleteAccount: DeleteAccountController;
}) {
  return new Hono()
    .get(
      '/accounts/:id/deletion-impact',
      validateRequest('param', accountIdParamSchema),
      async (c) =>
        c.json(await controllers.getDeletionImpact.handle({ params: c.req.valid('param') }), 200),
    )
    .delete('/accounts/:id', validateRequest('param', accountIdParamSchema), async (c) => {
      await controllers.deleteAccount.handle({ params: c.req.valid('param') });

      return c.body(null, 204);
    });
}
