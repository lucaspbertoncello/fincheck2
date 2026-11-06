import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Restaurar original": description, amount and date go back to what the bank sent. If the date
// moves on a card purchase, its invoice is asked again (a parcel keeps the one of its plan).
export class RestoreOriginalUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly invoiceMonths: InvoiceMonthResolver;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    invoiceMonths: InvoiceMonthResolver,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.invoiceMonths = invoiceMonths;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: RestoreOriginalUseCase.Input): Promise<RestoreOriginalUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const transaction = await requireTransaction(this.transactions, input.id, executor);
      const dateBefore = transaction.occurredOn;

      const changed = transaction.restoreOriginal(this.clock.now());
      if (changed) {
        if (
          !dateBefore.equals(transaction.occurredOn) &&
          transaction.invoiceMonth !== null &&
          transaction.installment === null
        ) {
          transaction.invoiceMonth = await this.invoiceMonths.resolve(
            await this.accounts.requireAccount(transaction.accountId, executor),
            transaction.occurredOn,
            executor,
          );
        }
        await this.transactions.save(transaction, executor);
      }

      return this.builder.buildOne(transaction.id, executor);
    });
  }
}

export namespace RestoreOriginalUseCase {
  export type Input = { id: string };
  export type Output = TransactionContract.Dto;
}
