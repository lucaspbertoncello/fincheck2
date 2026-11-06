import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Undoes the split: the transaction goes back to one piece, with no category (in review again, if
// its nature counts).
export class UnsplitTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnsplitTransactionUseCase.Input): Promise<UnsplitTransactionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const transaction = await requireTransaction(this.transactions, input.id, executor);
      transaction.unsplit(this.clock.now());
      await this.transactions.save(transaction, executor);

      return this.builder.buildOne(transaction.id, executor);
    });
  }
}

export namespace UnsplitTransactionUseCase {
  export type Input = { id: string };
  export type Output = TransactionContract.Dto;
}
