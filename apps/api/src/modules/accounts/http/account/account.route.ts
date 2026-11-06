import {
  createAccountRequestSchema,
  listAccountsQuerySchema,
  updateAccountRequestSchema,
} from '@fincheck/shared/accounts/account/account.schema.ts';
import { Hono } from 'hono';

import type { ArchiveAccountController } from '#/modules/accounts/http/account/archive-account.controller.ts';
import { accountIdParamSchema } from '#/modules/accounts/http/account/account-id-param.schema.ts';
import type { CreateAccountController } from '#/modules/accounts/http/account/create-account.controller.ts';
import type { GetAccountController } from '#/modules/accounts/http/account/get-account.controller.ts';
import type { ListAccountsController } from '#/modules/accounts/http/account/list-accounts.controller.ts';
import type { UnarchiveAccountController } from '#/modules/accounts/http/account/unarchive-account.controller.ts';
import type { UpdateAccountController } from '#/modules/accounts/http/account/update-account.controller.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

// The routes of `accounts` that depend on nothing outside it, plus the readings of balance and
// connection that the presenter asks to the other owners.
export function createAccountRoute(controllers: {
  listAccounts: ListAccountsController;
  getAccount: GetAccountController;
  createAccount: CreateAccountController;
  updateAccount: UpdateAccountController;
  archiveAccount: ArchiveAccountController;
  unarchiveAccount: UnarchiveAccountController;
}) {
  return new Hono()
    .get('/accounts', validateRequest('query', listAccountsQuerySchema), async (c) =>
      c.json(await controllers.listAccounts.handle({ query: c.req.valid('query') }), 200),
    )
    .get('/accounts/:id', validateRequest('param', accountIdParamSchema), async (c) =>
      c.json(await controllers.getAccount.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/accounts', validateRequest('json', createAccountRequestSchema), async (c) =>
      c.json(await controllers.createAccount.handle({ body: c.req.valid('json') }), 201),
    )
    .patch(
      '/accounts/:id',
      validateRequest('param', accountIdParamSchema),
      validateRequest('json', updateAccountRequestSchema),
      async (c) =>
        c.json(
          await controllers.updateAccount.handle({
            params: c.req.valid('param'),
            body: c.req.valid('json'),
          }),
          200,
        ),
    )
    .post('/accounts/:id/archive', validateRequest('param', accountIdParamSchema), async (c) =>
      c.json(await controllers.archiveAccount.handle({ params: c.req.valid('param') }), 200),
    )
    .post('/accounts/:id/unarchive', validateRequest('param', accountIdParamSchema), async (c) =>
      c.json(await controllers.unarchiveAccount.handle({ params: c.req.valid('param') }), 200),
    );
}
