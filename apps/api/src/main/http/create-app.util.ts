import type { ApiError } from '@fincheck/shared/common/api-error/api-error.type.ts';
import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { createLocalTokenMiddleware } from '#/main/http/middlewares/local-token.middleware.ts';
import { createCategoriesModule } from '#/main/http/create-categories-module.util.ts';
import { createTransactionsCategoryPorts } from '#/main/http/create-transactions-category-ports.util.ts';
import { createTransactionsModule } from '#/main/http/create-transactions-module.util.ts';
import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { ArchiveAccountUseCase } from '#/modules/accounts/application/account/archive-account.usecase.ts';
import { AdjustAccountBalanceUseCase } from '#/modules/accounts/application/account/adjust-account-balance.usecase.ts';
import { CreateAccountUseCase } from '#/modules/accounts/application/account/create-account.usecase.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { GetAccountUseCase } from '#/modules/accounts/application/account/get-account.usecase.ts';
import { GetBalanceHistoryUseCase } from '#/modules/accounts/application/account/get-balance-history.usecase.ts';
import { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';
import { UnarchiveAccountUseCase } from '#/modules/accounts/application/account/unarchive-account.usecase.ts';
import { UpdateAccountUseCase } from '#/modules/accounts/application/account/update-account.usecase.ts';
import { AdjustAccountBalanceController } from '#/modules/accounts/http/account/adjust-account-balance.controller.ts';
import { ArchiveAccountController } from '#/modules/accounts/http/account/archive-account.controller.ts';
import { createAccountBalanceRoute } from '#/modules/accounts/http/account/account-balance.route.ts';
import { createAccountRoute } from '#/modules/accounts/http/account/account.route.ts';
import { CreateAccountController } from '#/modules/accounts/http/account/create-account.controller.ts';
import { GetAccountController } from '#/modules/accounts/http/account/get-account.controller.ts';
import { GetBalanceHistoryController } from '#/modules/accounts/http/account/get-balance-history.controller.ts';
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

  // The contexts know each other only through ports. accounts asks transactions for the balance,
  // the movement and the adjustment, and transactions asks accounts which account a transaction is
  // in. categories asks transactions for the use of each category, tag and rule, the history a rule
  // previews and recategorizes, and what Lucas categorized by hand; transactions asks categories for
  // the category, the tag, the rules still alive and the suggestions of the review queue. The Pluggy
  // connection belongs to sync, which does not exist yet (its port stays unwired: the connection
  // shows as null). Deletion impact and deletion (createAccountDeletionRoute) have their
  // transactions side ready but also need invoices, so they are NOT mounted yet; likewise
  // transactions has no invoice, link or recurrence reader yet: see createTransactionsModule for
  // what that leaves out of the routes.
  const accounts = new KyselyAccountRepository(db);
  const accountRefs = new GetAccountRefQuery(accounts);
  const categories = createCategoriesModule({
    db,
    unitOfWork,
    clock,
    accounts: accountRefs,
    transactionPorts: createTransactionsCategoryPorts({ db, clock }),
  });
  const transactions = createTransactionsModule({
    db,
    unitOfWork,
    clock,
    accounts: accountRefs,
    readers: categories.transactionReaders,
  });
  // bulkRoute exists when the readers of categories are plugged in, which they are just above.
  // Failing to start is better than a silent 404 on POST /transactions/bulk.
  if (transactions.bulkRoute === undefined) {
    throw new Error('The bulk route needs the readers of categories');
  }
  const accountPresenter = new AccountPresenter(
    transactions.accountPorts.manualBalances,
    undefined,
  );
  const listAccounts = new ListAccountsController(
    new ListAccountsUseCase(accounts, accountPresenter),
  );
  const getAccount = new GetAccountController(new GetAccountUseCase(accounts, accountPresenter));
  const createAccount = new CreateAccountController(
    new CreateAccountUseCase(
      accounts,
      transactions.accountPorts.balanceAdjustments,
      accountPresenter,
      unitOfWork,
      clock,
    ),
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
  const accountBalance = createAccountBalanceRoute({
    getBalanceHistory: new GetBalanceHistoryController(
      new GetBalanceHistoryUseCase(accounts, transactions.accountPorts.movements, clock),
    ),
    adjustAccountBalance: new AdjustAccountBalanceController(
      new AdjustAccountBalanceUseCase(
        accounts,
        transactions.accountPorts.manualBalances,
        transactions.accountPorts.balanceAdjustments,
        accountPresenter,
        unitOfWork,
        clock,
      ),
    ),
  });

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
      .route('/', accountBalance)
      .route('/', categories.routes)
      .route('/', transactions.routes)
      .route('/', transactions.bulkRoute)
  );
}
