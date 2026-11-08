import { Hono } from 'hono';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { CountAccountTransactionsQuery } from '#/modules/transactions/application/account-deletion/count-account-transactions.query.ts';
import { DeleteAccountTransactionsUseCase } from '#/modules/transactions/application/account-deletion/delete-account-transactions.usecase.ts';
import { CreateBalanceAdjustmentUseCase } from '#/modules/transactions/application/account-balance/create-balance-adjustment.usecase.ts';
import { GetAccountBalancesQuery } from '#/modules/transactions/application/account-balance/get-account-balances.query.ts';
import { GetAccountMovementQuery } from '#/modules/transactions/application/account-balance/get-account-movement.query.ts';
import { CreateInstallmentPlanUseCase } from '#/modules/transactions/application/installment-plan/create-installment-plan.usecase.ts';
import { DeleteInstallmentPlanUseCase } from '#/modules/transactions/application/installment-plan/delete-installment-plan.usecase.ts';
import { InstallmentPlanDtoBuilder } from '#/modules/transactions/application/installment-plan/installment-plan-dto-builder.service.ts';
import { ListInstallmentPlansQuery } from '#/modules/transactions/application/installment-plan/list-installment-plans.query.ts';
import type { OpenInvoiceMonthReader } from '#/modules/transactions/application/installment-plan/open-invoice-month-reader.interface.ts';
import { BulkTransactionsUseCase } from '#/modules/transactions/application/transaction/bulk-transactions.usecase.ts';
import type { CategoryRuleReader } from '#/modules/transactions/application/transaction/category-rule-reader.interface.ts';
import type { CategorySuggestionReader } from '#/modules/transactions/application/transaction/category-suggestion-reader.interface.ts';
import { CreateTransactionUseCase } from '#/modules/transactions/application/transaction/create-transaction.usecase.ts';
import { DeleteTransactionUseCase } from '#/modules/transactions/application/transaction/delete-transaction.usecase.ts';
import { GetReviewQueueQuery } from '#/modules/transactions/application/transaction/get-review-queue.query.ts';
import { GetTransactionQuery } from '#/modules/transactions/application/transaction/get-transaction.query.ts';
import { GetTransactionSummaryQuery } from '#/modules/transactions/application/transaction/get-transaction-summary.query.ts';
import { IgnoreTransactionUseCase } from '#/modules/transactions/application/transaction/ignore-transaction.usecase.ts';
import type { InvoiceMonthReader } from '#/modules/transactions/application/transaction/invoice-month-reader.interface.ts';
import { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import { ListTransactionsQuery } from '#/modules/transactions/application/transaction/list-transactions.query.ts';
import type { RecurrenceCandidateReader } from '#/modules/transactions/application/transaction/recurrence-candidate-reader.interface.ts';
import { ResolveBankChangeUseCase } from '#/modules/transactions/application/transaction/resolve-bank-change.usecase.ts';
import { RestoreBulkTransactionsUseCase } from '#/modules/transactions/application/transaction/restore-bulk-transactions.usecase.ts';
import { RestoreOriginalUseCase } from '#/modules/transactions/application/transaction/restore-original.usecase.ts';
import { SplitTransactionUseCase } from '#/modules/transactions/application/transaction/split-transaction.usecase.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionCategoryReader } from '#/modules/transactions/application/transaction/transaction-category-reader.interface.ts';
import { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import type { TransactionTagReader } from '#/modules/transactions/application/transaction/transaction-tag-reader.interface.ts';
import { UnignoreTransactionUseCase } from '#/modules/transactions/application/transaction/unignore-transaction.usecase.ts';
import { UnsplitTransactionUseCase } from '#/modules/transactions/application/transaction/unsplit-transaction.usecase.ts';
import { UpdateTransactionUseCase } from '#/modules/transactions/application/transaction/update-transaction.usecase.ts';
import { CreateInstallmentPlanController } from '#/modules/transactions/http/installment-plan/create-installment-plan.controller.ts';
import { DeleteInstallmentPlanController } from '#/modules/transactions/http/installment-plan/delete-installment-plan.controller.ts';
import { createInstallmentPlanDeletionRoute } from '#/modules/transactions/http/installment-plan/installment-plan-deletion.route.ts';
import { createInstallmentPlanRoute } from '#/modules/transactions/http/installment-plan/installment-plan.route.ts';
import { ListInstallmentPlansController } from '#/modules/transactions/http/installment-plan/list-installment-plans.controller.ts';
import { BulkTransactionsController } from '#/modules/transactions/http/transaction/bulk-transactions.controller.ts';
import { CreateTransactionController } from '#/modules/transactions/http/transaction/create-transaction.controller.ts';
import { DeleteTransactionController } from '#/modules/transactions/http/transaction/delete-transaction.controller.ts';
import { GetReviewQueueController } from '#/modules/transactions/http/transaction/get-review-queue.controller.ts';
import { GetTransactionController } from '#/modules/transactions/http/transaction/get-transaction.controller.ts';
import { GetTransactionSummaryController } from '#/modules/transactions/http/transaction/get-transaction-summary.controller.ts';
import { IgnoreTransactionController } from '#/modules/transactions/http/transaction/ignore-transaction.controller.ts';
import { ListTransactionsController } from '#/modules/transactions/http/transaction/list-transactions.controller.ts';
import { ResolveBankChangeController } from '#/modules/transactions/http/transaction/resolve-bank-change.controller.ts';
import { RestoreBulkTransactionsController } from '#/modules/transactions/http/transaction/restore-bulk-transactions.controller.ts';
import { RestoreOriginalController } from '#/modules/transactions/http/transaction/restore-original.controller.ts';
import { SplitTransactionController } from '#/modules/transactions/http/transaction/split-transaction.controller.ts';
import { createTransactionBulkRoute } from '#/modules/transactions/http/transaction/transaction-bulk.route.ts';
import { createTransactionRoute } from '#/modules/transactions/http/transaction/transaction.route.ts';
import { UnignoreTransactionController } from '#/modules/transactions/http/transaction/unignore-transaction.controller.ts';
import { UnsplitTransactionController } from '#/modules/transactions/http/transaction/unsplit-transaction.controller.ts';
import { UpdateTransactionController } from '#/modules/transactions/http/transaction/update-transaction.controller.ts';
import { KyselyInstallmentPlanRepository } from '#/modules/transactions/infra/installment-plan/installment-plan.repository.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Builds the `transactions` module by hand: its routes and the ports `accounts` asks it for. The
// readers of the contexts that are not all built (`categories` and `invoices` are; `recurrences` and `bills` are not)
// are optional: without them the routes that do not need them work as they are, a request that
// names a category, a tag or a card purchase is refused with a 400, and the routes that cannot work
// at all without them (`bulk`, `installment-plans` list and creation) are not built. When each
// owner exists, its reader goes in here and the route in `createApp`.
export function createTransactionsModule(deps: {
  db: Kysely<Database>;
  unitOfWork: UnitOfWork<Kysely<Database>>;
  clock: Clock;
  accounts: TransactionAccountReader;
  readers?: {
    categories?: TransactionCategoryReader | undefined;
    tags?: TransactionTagReader | undefined;
    categoryRules?: CategoryRuleReader | undefined;
    invoiceMonths?: InvoiceMonthReader | undefined;
    openInvoiceMonths?: OpenInvoiceMonthReader | undefined;
    links?: TransactionLinksReader | undefined;
    categorySuggestions?: CategorySuggestionReader | undefined;
    recurrenceCandidates?: RecurrenceCandidateReader | undefined;
  };
}) {
  const { db, unitOfWork, clock, accounts } = deps;
  const readers = deps.readers ?? {};

  const transactions = new KyselyTransactionRepository(db);
  const plans = new KyselyInstallmentPlanRepository(db);
  const references = new TransactionReferenceResolver(readers.categories, readers.tags);
  const invoiceMonths = new InvoiceMonthResolver(readers.invoiceMonths);
  const builder = new TransactionDtoBuilder(
    transactions,
    plans,
    readers.links,
    readers.categorySuggestions,
  );

  // Routes that work with what exists.
  const routes = new Hono()
    .route(
      '/',
      createTransactionRoute({
        listTransactions: new ListTransactionsController(
          new ListTransactionsQuery(db, accounts, builder),
        ),
        getTransactionSummary: new GetTransactionSummaryController(
          new GetTransactionSummaryQuery(db),
        ),
        getReviewQueue: new GetReviewQueueController(
          new GetReviewQueueQuery(db, builder, readers.recurrenceCandidates),
        ),
        getTransaction: new GetTransactionController(new GetTransactionQuery(builder)),
        createTransaction: new CreateTransactionController(
          new CreateTransactionUseCase(
            transactions,
            accounts,
            references,
            invoiceMonths,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        updateTransaction: new UpdateTransactionController(
          new UpdateTransactionUseCase(
            transactions,
            accounts,
            references,
            invoiceMonths,
            readers.links,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        deleteTransaction: new DeleteTransactionController(
          new DeleteTransactionUseCase(transactions, accounts, unitOfWork, clock),
        ),
        restoreOriginal: new RestoreOriginalController(
          new RestoreOriginalUseCase(
            transactions,
            accounts,
            invoiceMonths,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        resolveBankChange: new ResolveBankChangeController(
          new ResolveBankChangeUseCase(
            transactions,
            accounts,
            invoiceMonths,
            builder,
            unitOfWork,
            clock,
          ),
        ),
        ignoreTransaction: new IgnoreTransactionController(
          new IgnoreTransactionUseCase(transactions, builder, unitOfWork, clock),
        ),
        unignoreTransaction: new UnignoreTransactionController(
          new UnignoreTransactionUseCase(transactions, builder, unitOfWork, clock),
        ),
        splitTransaction: new SplitTransactionController(
          new SplitTransactionUseCase(transactions, references, builder, unitOfWork, clock),
        ),
        unsplitTransaction: new UnsplitTransactionController(
          new UnsplitTransactionUseCase(transactions, builder, unitOfWork, clock),
        ),
      }),
    )
    .route(
      '/',
      createInstallmentPlanDeletionRoute({
        deleteInstallmentPlan: new DeleteInstallmentPlanController(
          new DeleteInstallmentPlanUseCase(plans, unitOfWork),
        ),
      }),
    );

  // Needs the readers of `categories`: the category, the tag and the rules it writes.
  const bulkRoute =
    readers.categories && readers.tags && readers.categoryRules
      ? createTransactionBulkRoute({
          bulkTransactions: new BulkTransactionsController(
            new BulkTransactionsUseCase(transactions, references, unitOfWork, clock),
          ),
          restoreBulkTransactions: new RestoreBulkTransactionsController(
            new RestoreBulkTransactionsUseCase(
              transactions,
              readers.categoryRules,
              references,
              unitOfWork,
              clock,
            ),
          ),
        })
      : undefined;

  // Waits for `invoices`: the open invoice of each card.
  const planBuilder = readers.openInvoiceMonths
    ? new InstallmentPlanDtoBuilder(transactions, readers.openInvoiceMonths)
    : undefined;
  const installmentPlanRoute = planBuilder
    ? createInstallmentPlanRoute({
        createInstallmentPlan: new CreateInstallmentPlanController(
          new CreateInstallmentPlanUseCase(
            plans,
            transactions,
            accounts,
            references,
            planBuilder,
            unitOfWork,
            clock,
          ),
        ),
        listInstallmentPlans: new ListInstallmentPlansController(
          new ListInstallmentPlansQuery(plans, accounts, planBuilder),
        ),
      })
    : undefined;

  return {
    routes,
    bulkRoute,
    installmentPlanRoute,
    // The ports `accounts` declares and `transactions` fulfils.
    accountPorts: {
      manualBalances: new GetAccountBalancesQuery(db, clock),
      movements: new GetAccountMovementQuery(db),
      balanceAdjustments: new CreateBalanceAdjustmentUseCase(transactions, clock),
      transactionCounts: new CountAccountTransactionsQuery(db),
      deleteTransactions: new DeleteAccountTransactionsUseCase(transactions, accounts, clock),
    },
  };
}
