import type { ApiError } from '@fincheck/shared/common/api-error/api-error.type.ts';
import { Hono } from 'hono';

import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { createLocalTokenMiddleware } from '#/main/http/middlewares/local-token.middleware.ts';
import { createBackupModule } from '#/main/http/create-backup-module.util.ts';
import { createCategoriesModule } from '#/main/http/create-categories-module.util.ts';
import { composeLinkedTransactionReaders } from '#/main/http/compose-linked-transaction-readers.util.ts';
import { createBillsModule } from '#/main/http/create-bills-module.util.ts';
import { createBillsReaders } from '#/main/http/create-bills-readers.util.ts';
import { createTransactionsBillPorts } from '#/main/http/create-transactions-bill-ports.util.ts';
import { composeTransactionLinksReaders } from '#/main/http/compose-transaction-links-readers.util.ts';
import { createInvoicesModule } from '#/main/http/create-invoices-module.util.ts';
import { createProfileModule } from '#/main/http/create-profile-module.util.ts';
import { createRecurrencesModule } from '#/main/http/create-recurrences-module.util.ts';
import { createTransactionsCategoryPorts } from '#/main/http/create-transactions-category-ports.util.ts';
import { createTransactionsInvoicePorts } from '#/main/http/create-transactions-invoice-ports.util.ts';
import { createTransactionsProfilePorts } from '#/main/http/create-transactions-profile-ports.util.ts';
import { createTransactionsRecurrencePorts } from '#/main/http/create-transactions-recurrence-ports.util.ts';
import { createTransactionsModule } from '#/main/http/create-transactions-module.util.ts';
import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { ArchiveAccountUseCase } from '#/modules/accounts/application/account/archive-account.usecase.ts';
import { AdjustAccountBalanceUseCase } from '#/modules/accounts/application/account/adjust-account-balance.usecase.ts';
import { CreateAccountUseCase } from '#/modules/accounts/application/account/create-account.usecase.ts';
import { DeleteAccountUseCase } from '#/modules/accounts/application/account/delete-account.usecase.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { GetAccountUseCase } from '#/modules/accounts/application/account/get-account.usecase.ts';
import { GetBalanceHistoryUseCase } from '#/modules/accounts/application/account/get-balance-history.usecase.ts';
import { GetCardRefsQuery } from '#/modules/accounts/application/account/get-card-refs.query.ts';
import { GetDeletionImpactUseCase } from '#/modules/accounts/application/account/get-deletion-impact.usecase.ts';
import { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';
import { UnarchiveAccountUseCase } from '#/modules/accounts/application/account/unarchive-account.usecase.ts';
import { UpdateAccountUseCase } from '#/modules/accounts/application/account/update-account.usecase.ts';
import { AdjustAccountBalanceController } from '#/modules/accounts/http/account/adjust-account-balance.controller.ts';
import { ArchiveAccountController } from '#/modules/accounts/http/account/archive-account.controller.ts';
import { createAccountBalanceRoute } from '#/modules/accounts/http/account/account-balance.route.ts';
import { createAccountRoute } from '#/modules/accounts/http/account/account.route.ts';
import { createAccountDeletionRoute } from '#/modules/accounts/http/account/account-deletion.route.ts';
import { CreateAccountController } from '#/modules/accounts/http/account/create-account.controller.ts';
import { DeleteAccountController } from '#/modules/accounts/http/account/delete-account.controller.ts';
import { GetAccountController } from '#/modules/accounts/http/account/get-account.controller.ts';
import { GetBalanceHistoryController } from '#/modules/accounts/http/account/get-balance-history.controller.ts';
import { GetDeletionImpactController } from '#/modules/accounts/http/account/get-deletion-impact.controller.ts';
import { ListAccountsController } from '#/modules/accounts/http/account/list-accounts.controller.ts';
import { UnarchiveAccountController } from '#/modules/accounts/http/account/unarchive-account.controller.ts';
import { UpdateAccountController } from '#/modules/accounts/http/account/update-account.controller.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { GetTransactionOverviewQuery } from '#/modules/transactions/application/transaction-overview/get-transaction-overview.query.ts';
import { CountActiveAccountsQuery } from '#/modules/accounts/application/account/count-active-accounts.query.ts';
import { CheckDatabaseQuery } from '#/modules/health/application/health/check-database.query.ts';
import { GetHealthController } from '#/modules/health/http/health/get-health.controller.ts';
import { createHealthRoute } from '#/modules/health/http/health/health.route.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';

// The composition root of the HTTP side: builds each module's controllers by hand (no container)
// and mounts their routes. `clock` is the real one; a test passes a fixed one. Besides the app it
// hands back what the tasks of the API need from the modules (`createApp` keeps only the app, which
// is what the typed client of the web is made from).
export function createAppParts({
  db,
  localToken,
  clock = new SystemClock(),
}: {
  db: ReplaceableDatabase;
  localToken: string;
  clock?: Clock;
}) {
  const unitOfWork = new KyselyUnitOfWork(db);
  // On while the restore of a backup swaps the database file: health is not ok and the tasks wait.
  const gate = new MaintenanceGate();

  const getHealth = new GetHealthController(new CheckDatabaseQuery(db, gate));

  // The contexts know each other only through ports. accounts asks transactions for the balance,
  // the movement and the adjustment, and transactions asks accounts which account a transaction is
  // in. categories asks transactions for the use of each category, tag and rule, the history a rule
  // previews and recategorizes, and what Lucas categorized by hand; transactions asks categories for
  // the category, the tag, the rules still alive and the suggestions of the review queue. invoices
  // asks accounts for the cycle days of a card and transactions for the lines and sums of the cycle,
  // the transactions that pay and the candidates of the payment found, and it calls the use cases of
  // transactions that link and unlink a payment; transactions asks invoices for the invoice month of
  // a purchase, the open invoice of each card and the link of a payment. recurrences asks accounts
  // for the account, categories for the category and transactions for what each payment of an
  // occurrence is worth, the ones to pick from, the category it puts on the transaction and the
  // charges of the subscriptions; invoices asks recurrences for the expected occurrences of a card
  // and the transactions that already settle one, and transactions asks it for the link of an
  // occurrence and the candidates of the review queue. The deletion of an account calls the owners
  // of what hangs on it: invoices, transactions and categories. The Pluggy connection belongs to
  // sync, which does not exist yet: its port stays unwired (the connection shows as null). bills
  // asks categories for the category, transactions for what each transaction that pays or originates
  // a bill is worth, the ones to pick from and the effects on them (the friend part lent, the money
  // back reimbursed, the category of the bill), and invoices and recurrences for the transactions
  // that already settle one of theirs; those three ask bills back for the transactions it holds
  // (they cannot also pay an invoice or an occurrence) and transactions asks it for the link of a
  // bill.
  const accounts = new KyselyAccountRepository(db);
  const accountRefs = new GetAccountRefQuery(accounts);
  const billPorts = createTransactionsBillPorts({ db, clock });
  const billReaders = createBillsReaders({ db, transactions: billPorts.billTransactions });
  const categories = createCategoriesModule({
    db,
    unitOfWork,
    clock,
    accounts: accountRefs,
    transactionPorts: createTransactionsCategoryPorts({ db, clock }),
  });
  const recurrences = createRecurrencesModule({
    db,
    unitOfWork,
    clock,
    accounts: accountRefs,
    categories: categories.transactionReaders.categories,
    transactionPorts: createTransactionsRecurrencePorts({ db, clock }),
    linkedElsewhere: billReaders.linkedTransactions,
  });
  const invoices = createInvoicesModule({
    db,
    unitOfWork,
    clock,
    cards: new GetCardRefsQuery(accounts),
    transactionPorts: createTransactionsInvoicePorts({ db, accounts: accountRefs, clock }),
    expectations: recurrences.invoiceReaders.expectations,
    linkedElsewhere: composeLinkedTransactionReaders(
      recurrences.invoiceReaders.linkedTransactions,
      billReaders.linkedTransactions,
    ),
  });
  const bills = createBillsModule({
    db,
    unitOfWork,
    clock,
    categories: categories.transactionReaders.categories,
    transactionPorts: billPorts,
    linkedElsewhere: composeLinkedTransactionReaders(
      invoices.billReaders.linkedTransactions,
      recurrences.invoiceReaders.linkedTransactions,
    ),
  });
  const transactions = createTransactionsModule({
    db,
    unitOfWork,
    clock,
    accounts: accountRefs,
    readers: {
      ...categories.transactionReaders,
      ...invoices.transactionReaders,
      // Each owner only knows its own link: the invoice, the occurrence and the bill.
      links: composeTransactionLinksReaders(
        invoices.transactionReaders.links,
        recurrences.transactionReaders.occurrenceLinks,
        billReaders.links,
      ),
      recurrenceCandidates: recurrences.transactionReaders.recurrenceCandidates,
    },
  });
  const profile = createProfileModule({
    db,
    unitOfWork,
    clock,
    incomeSources: recurrences.profileReaders.incomeSources,
    ...createTransactionsProfilePorts({ db }),
  });
  // bulkRoute exists when the readers of categories are plugged in, which they are just above.
  // Failing to start is better than a silent 404 on POST /transactions/bulk.
  if (transactions.bulkRoute === undefined) {
    throw new Error('The bulk route needs the readers of categories');
  }
  // Likewise the installment plans: they need the open invoice of each card, from invoices.
  if (transactions.installmentPlanRoute === undefined) {
    throw new Error('The installment plan routes need the open invoice reader of invoices');
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

  const accountDeletion = createAccountDeletionRoute({
    getDeletionImpact: new GetDeletionImpactController(
      new GetDeletionImpactUseCase(
        accounts,
        transactions.accountPorts.transactionCounts,
        invoices.accountPorts.invoiceCounts,
        categories.accountPorts.ruleCounts,
        undefined,
      ),
    ),
    deleteAccount: new DeleteAccountController(
      new DeleteAccountUseCase(
        accounts,
        invoices.accountPorts.deleteInvoices,
        transactions.accountPorts.deleteTransactions,
        categories.accountPorts.deleteRules,
        unitOfWork,
      ),
    ),
  });

  const backup = createBackupModule({
    db,
    clock,
    gate,
    transactionOverview: new GetTransactionOverviewQuery(db),
    activeAccounts: new CountActiveAccountsQuery(db),
  });

  const app = new Hono()
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
    .route('/', accountDeletion)
    .route('/', categories.routes)
    .route('/', transactions.routes)
    .route('/', transactions.bulkRoute)
    .route('/', transactions.installmentPlanRoute)
    .route('/', invoices.routes)
    .route('/', recurrences.routes)
    .route('/', profile.routes)
    .route('/', bills.routes)
    .route('/', backup.routes);

  return {
    app,
    gate,
    ensureOccurrences: recurrences.ensureOccurrences,
    runDailyBackup: backup.runDailyBackup,
  };
}
