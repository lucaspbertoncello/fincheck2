import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import { ApplyBankVersionsUseCase } from '#/modules/transactions/application/bank-import/apply-bank-versions.usecase.ts';
import { ApplyDetectedNaturesUseCase } from '#/modules/transactions/application/bank-import/apply-detected-natures.usecase.ts';
import { ApplyImportRulesUseCase } from '#/modules/transactions/application/bank-import/apply-import-rules.usecase.ts';
import { CountBankTransactionsQuery } from '#/modules/transactions/application/bank-import/count-bank-transactions.query.ts';
import { ImportBankTransactionsUseCase } from '#/modules/transactions/application/bank-import/import-bank-transactions.usecase.ts';
import { ListBankTransactionsQuery } from '#/modules/transactions/application/bank-import/list-bank-transactions.query.ts';
import { ListDetectionPoolQuery } from '#/modules/transactions/application/bank-import/list-detection-pool.query.ts';
import { MarkRemovedByBankUseCase } from '#/modules/transactions/application/bank-import/mark-removed-by-bank.usecase.ts';
import type { InvoiceMonthReader } from '#/modules/transactions/application/transaction/invoice-month-reader.interface.ts';
import { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import { KyselyInstallmentPlanRepository } from '#/modules/transactions/infra/installment-plan/installment-plan.repository.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `sync` asks of `transactions` (the port `SyncTransactions`): create the new transactions of
// the bank, apply its version to the ones already there, mark the removed ones, set the natures the
// detectors found and the categories the rules gave, and read what the sync needs to tell one
// transaction from another. Built after `invoices` and the readers of links, which it asks: the
// invoice of a card purchase and what a transaction already pays.
export function createTransactionsSyncPorts(deps: {
  db: Kysely<Database>;
  clock: Clock;
  accounts: TransactionAccountReader;
  invoiceMonths: InvoiceMonthReader;
  links: TransactionLinksReader;
}): SyncTransactions {
  const transactions = new KyselyTransactionRepository(deps.db);
  const plans = new KyselyInstallmentPlanRepository(deps.db);
  const invoiceMonths = new InvoiceMonthResolver(deps.invoiceMonths);

  const importNew = new ImportBankTransactionsUseCase(
    transactions,
    plans,
    deps.accounts,
    invoiceMonths,
    deps.clock,
  );
  const applyBankVersions = new ApplyBankVersionsUseCase(
    transactions,
    deps.accounts,
    invoiceMonths,
    deps.clock,
  );
  const markRemovedByBank = new MarkRemovedByBankUseCase(transactions, deps.clock);
  const applyDetectedNatures = new ApplyDetectedNaturesUseCase(transactions, deps.clock);
  const applyRules = new ApplyImportRulesUseCase(transactions, deps.clock);
  const listBank = new ListBankTransactionsQuery(deps.db);
  const listDetectionPool = new ListDetectionPoolQuery(deps.db, deps.links);
  const countBank = new CountBankTransactionsQuery(deps.db);

  return {
    importNew: (input, executor) => importNew.execute(input, executor),
    applyBankVersions: (input, executor) => applyBankVersions.execute(input, executor),
    markRemovedByBank: (input, executor) => markRemovedByBank.execute(input, executor),
    applyDetectedNatures: (input, executor) => applyDetectedNatures.execute(input, executor),
    applyRules: (input, executor) => applyRules.execute(input, executor),
    listBank: (input, executor) => listBank.execute(input, executor),
    listDetectionPool: (input, executor) => listDetectionPool.execute(input, executor),
    countBank: (accountIds, executor) => countBank.execute(accountIds, executor),
  };
}
