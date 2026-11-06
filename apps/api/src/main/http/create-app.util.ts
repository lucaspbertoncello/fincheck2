import type { ApiError } from '@fincheck/shared/common/api-error/api-error.type.ts';
import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { createLocalTokenMiddleware } from '#/main/http/middlewares/local-token.middleware.ts';
import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { ArchiveAccountUseCase } from '#/modules/accounts/application/account/archive-account.usecase.ts';
import { CreateAccountUseCase } from '#/modules/accounts/application/account/create-account.usecase.ts';
import { GetAccountUseCase } from '#/modules/accounts/application/account/get-account.usecase.ts';
import { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';
import { UnarchiveAccountUseCase } from '#/modules/accounts/application/account/unarchive-account.usecase.ts';
import { UpdateAccountUseCase } from '#/modules/accounts/application/account/update-account.usecase.ts';
import { ArchiveAccountController } from '#/modules/accounts/http/account/archive-account.controller.ts';
import { createAccountRoute } from '#/modules/accounts/http/account/account.route.ts';
import { CreateAccountController } from '#/modules/accounts/http/account/create-account.controller.ts';
import { GetAccountController } from '#/modules/accounts/http/account/get-account.controller.ts';
import { ListAccountsController } from '#/modules/accounts/http/account/list-accounts.controller.ts';
import { UnarchiveAccountController } from '#/modules/accounts/http/account/unarchive-account.controller.ts';
import { UpdateAccountController } from '#/modules/accounts/http/account/update-account.controller.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { CheckDatabaseQuery } from '#/modules/health/application/health/check-database.query.ts';
import { GetHealthController } from '#/modules/health/http/health/get-health.controller.ts';
import { createHealthRoute } from '#/modules/health/http/health/health.route.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// The composition root of the HTTP side: builds each module's controllers by hand (no container)
// and mounts their routes. `clock` is the real one; a test passes a fixed one.
export function createApp({
  db,
  localToken,
  clock = new SystemClock(),
}: {
  db: Kysely<Database>;
  localToken: string;
  clock?: Clock;
}) {
  const unitOfWork = new KyselyUnitOfWork(db);

  const getHealth = new GetHealthController(new CheckDatabaseQuery(db));

  // accounts. The manual balance, the Pluggy connection and the balance adjustment belong to
  // `transactions` and `sync`, which do not exist yet: their ports are left unwired (`undefined`),
  // so a manual balance and a connection show as null and an initial balance is refused. The routes
  // that need the owners (balance history, balance adjustment, deletion impact, deletion) have
  // controllers and routes but are NOT mounted until piece 3 (`transactions`), 4 (`categories`)
  // and 5 (`invoices`) exist; piece 3 wires `createAccountBalanceRoute` and the ports.
  const accounts = new KyselyAccountRepository(db);
  const accountPresenter = new AccountPresenter(undefined, undefined);
  const listAccounts = new ListAccountsController(
    new ListAccountsUseCase(accounts, accountPresenter),
  );
  const getAccount = new GetAccountController(new GetAccountUseCase(accounts, accountPresenter));
  const createAccount = new CreateAccountController(
    new CreateAccountUseCase(accounts, undefined, accountPresenter, unitOfWork, clock),
  );
  const updateAccount = new UpdateAccountController(
    new UpdateAccountUseCase(accounts, accountPresenter, unitOfWork, clock),
  );
  const archiveAccount = new ArchiveAccountController(
    new ArchiveAccountUseCase(accounts, accountPresenter, unitOfWork, clock),
  );
  const unarchiveAccount = new UnarchiveAccountController(
    new UnarchiveAccountUseCase(accounts, accountPresenter, unitOfWork, clock),
  );

  return (
    new Hono()
      .notFound((c) =>
        c.json<ApiError.Dto>({ code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' }, 404),
      )
      .onError(handleError)
      // Keep the token middleware before every `.route(...)`: Hono only guards what comes after it.
      .use(createLocalTokenMiddleware(localToken))
      .route('/', createHealthRoute(getHealth))
      .route(
        '/',
        createAccountRoute({
          listAccounts,
          getAccount,
          createAccount,
          updateAccount,
          archiveAccount,
          unarchiveAccount,
        }),
      )
  );
}
