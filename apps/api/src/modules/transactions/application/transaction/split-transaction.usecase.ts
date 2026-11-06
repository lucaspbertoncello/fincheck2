import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Dividir em duas" (RF-TRX-005): defines, or redoes, the parts of a transaction. The sum of the
// parts and the sign are the entity's rule; the categories of the parts are checked by `categories`.
export class SplitTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly references: TransactionReferenceResolver;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    references: TransactionReferenceResolver,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.references = references;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: SplitTransactionUseCase.Input): Promise<SplitTransactionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const transaction = await requireTransaction(this.transactions, input.id, executor);
      const categories = await this.references.categoriesById(
        input.parts.flatMap((part) => part.categoryId ?? []),
        executor,
      );

      transaction.splitInto(
        input.parts.map((part) => ({
          amount: Money.fromCents(part.amountCents),
          category: part.categoryId ? (categories.get(part.categoryId) ?? null) : null,
          description: part.description ?? null,
        })),
        this.clock.now(),
      );
      await this.transactions.save(transaction, executor);

      return this.builder.buildOne(transaction.id, executor);
    });
  }
}

export namespace SplitTransactionUseCase {
  export type Input = { id: string } & TransactionContract.SplitRequest;
  export type Output = TransactionContract.Dto;
}
