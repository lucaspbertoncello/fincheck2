import { adjustBalanceRequestSchema } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { balanceHistoryQuerySchema } from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { Hono } from 'hono';

import type { AdjustAccountBalanceController } from '#/modules/accounts/http/account/adjust-account-balance.controller.ts';
import { idParamSchema } from '@fincheck/shared/common/id/id-param.schema.ts';
import type { GetBalanceHistoryController } from '#/modules/accounts/http/account/get-balance-history.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The routes that wait for `transactions` (the movement of the account and the adjustment it
// records). Not mounted in `main` until that context exists: see "a ligar" in the report of piece 2.
export function createAccountBalanceRoute(controllers: {
  getBalanceHistory: GetBalanceHistoryController;
  adjustAccountBalance: AdjustAccountBalanceController;
}) {
  return new Hono()
    .get(
      '/accounts/:id/balance-history',
      validateRequest('param', idParamSchema),
      validateRequest('query', balanceHistoryQuerySchema),
      async (c) =>
        c.json(
          await controllers.getBalanceHistory.handle({
            params: c.req.valid('param'),
            query: c.req.valid('query'),
          }),
          200,
        ),
    )
    .post(
      '/accounts/:id/balance-adjustments',
      validateRequest('param', idParamSchema),
      validateRequest('json', adjustBalanceRequestSchema),
      async (c) =>
        c.json(
          await controllers.adjustAccountBalance.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          201,
        ),
    );
}
