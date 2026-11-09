import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The bank sent again a transaction Fincheck already has (BR-TRX-004, BR-TRX-005): each of
// description, amount and date follows the bank when what is in use was the bank's own, and waits
// for Lucas (`bankChange`) when he edited it; a transaction the bank had removed and sent again is
// back. When the date of a card purchase followed the bank, the invoice it falls in is worked out
// again (an installment keeps its invoice, N6). What did not change is not written and not counted.
// Runs inside the unit of work of the round, with its executor.
export class ApplyBankVersionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    invoiceMonths: InvoiceMonthResolver,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.invoiceMonths = invoiceMonths;
    this.clock = clock;
  }

  async execute(
    input: ApplyBankVersionsUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ApplyBankVersionsUseCase.Output> {
    const now = this.clock.now();
    const byId = new Map(
      (
        await this.transactions.findByIds(
          input.updates.map((update) => update.transactionId),
          executor,
        )
      ).map((transaction) => [transaction.id, transaction]),
    );
    let updatedCount = 0;

    for (const update of input.updates) {
      const transaction = byId.get(update.transactionId);
      const before = transaction?.bank;
      // A transaction without the bank's version is not one the bank sent: nothing to follow.
      if (!transaction || !before) continue;

      const version = {
        description: update.description,
        amount: Money.fromCents(update.amountCents),
        occurredOn: BusinessDate.of(update.occurredOn),
        counterparty: update.counterparty,
        status: update.status,
      };
      const changed =
        before.description !== version.description ||
        !before.amount.equals(version.amount) ||
        !before.occurredOn.equals(version.occurredOn) ||
        before.counterparty !== version.counterparty ||
        before.status !== version.status;
      const wasRemoved = transaction.removedByBankAt !== null;
      if (!changed && !wasRemoved) continue;

      const dateBefore = transaction.occurredOn;
      transaction.applyBankVersion(version, now);
      if (
        transaction.invoiceMonth !== null &&
        transaction.installment === null &&
        !transaction.occurredOn.equals(dateBefore)
      ) {
        const account = await this.accounts.requireAccount(transaction.accountId, executor);
        transaction.invoiceMonth = await this.invoiceMonths.resolve(
          account,
          transaction.occurredOn,
          executor,
        );
      }
      await this.transactions.save(transaction, executor);
      updatedCount += 1;
    }

    return { updatedCount };
  }
}

export namespace ApplyBankVersionsUseCase {
  export type Update = {
    transactionId: string;
    description: string;
    amountCents: number;
    occurredOn: string;
    counterparty: string | null;
    status: 'pending' | 'posted';
  };

  export type Input = { updates: Update[] };

  // `updatedCount`: the ones the bank changed or sent again after removing.
  export type Output = { updatedCount: number };
}
