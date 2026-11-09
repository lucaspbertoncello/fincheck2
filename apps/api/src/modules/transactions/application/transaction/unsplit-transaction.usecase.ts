import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { requireTransaction } from '#/modules/transactions/application/transaction/require-transaction.util.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import type { TransactionDtoBuilder } from '#/modules/transactions/application/transaction/transaction-dto-builder.service.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Undoes the split: the transaction goes back to one piece, with no category (in review again, if
// its nature counts). A credit on a card that was income by the category of its parts goes back to
// expense, so the account and the links (which lock the nature) are read.
export class UnsplitTransactionUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly accounts: TransactionAccountReader;
  private readonly links: TransactionLinksReader | undefined;
  private readonly builder: TransactionDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    accounts: TransactionAccountReader,
    links: TransactionLinksReader | undefined,
    builder: TransactionDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.links = links;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UnsplitTransactionUseCase.Input): Promise<UnsplitTransactionUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const transaction = await requireTransaction(this.transactions, input.id, executor);
      const account = await this.accounts.requireAccount(transaction.accountId, executor);
      const links = this.links
        ? (await this.links.linksOf([transaction.id], executor)).get(transaction.id)
        : undefined;
      transaction.unsplit(this.clock.now(), {
        isCardAccount: account.isCard,
        hasActiveOccurrenceLink: Boolean(links?.occurrence),
        hasActiveBillLink: links?.bill?.role === 'payment',
      });
      await this.transactions.save(transaction, executor);

      return this.builder.buildOne(transaction.id, executor);
    });
  }
}

export namespace UnsplitTransactionUseCase {
  export type Input = { id: string };
  export type Output = TransactionContract.Dto;
}
