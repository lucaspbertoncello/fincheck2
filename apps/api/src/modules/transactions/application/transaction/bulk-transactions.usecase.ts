import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionReferenceResolver } from '#/modules/transactions/application/transaction/transaction-reference-resolver.service.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionCategoryArchivedError } from '#/modules/transactions/domain/transaction/transaction-category-archived.error.ts';
import { TransactionTagArchivedError } from '#/modules/transactions/domain/transaction/transaction-tag-archived.error.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Selection mode (RF-CAT-007): categorize, add a tag or ignore many transactions at once, in one
// unit of work. What cannot change is skipped with its reason and does not cancel the rest; for each
// one that changed, the state before goes back so "Desfazer" can restore it.
export class BulkTransactionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly references: TransactionReferenceResolver;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    references: TransactionReferenceResolver,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.references = references;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: BulkTransactionsUseCase.Input): Promise<BulkTransactionsUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const apply = await this.prepare(input.action, executor);
      const found = new Map(
        (await this.transactions.findByIds(input.transactionIds, executor)).map((transaction) => [
          transaction.id,
          transaction,
        ]),
      );

      const skipped: TransactionBulk.Result['skipped'] = [];
      const previous: TransactionBulk.Result['previous'] = [];
      for (const transactionId of input.transactionIds) {
        const transaction = found.get(transactionId);
        if (!transaction) {
          skipped.push({ transactionId, reason: 'not_found' });
          continue;
        }

        const state = transaction.previousState();
        const reason = apply(transaction, now);
        if (reason !== null) {
          skipped.push({ transactionId, reason });
          continue;
        }
        previous.push(state);
        await this.transactions.save(transaction, executor);
      }

      return { updatedCount: previous.length, skipped, previous };
    });
  }

  // Checks the category or the tag of the action once, and gives the change for one transaction:
  // it applies it and answers null, or answers the reason to skip without touching it.
  private async prepare(
    action: TransactionBulk.Action,
    executor: Kysely<Database>,
  ): Promise<
    (
      transaction: Transaction,
      now: string,
    ) => TransactionBulk.Result['skipped'][number]['reason'] | null
  > {
    if (action.type === 'categorize') {
      const category = await this.references.category(action.categoryId, executor);
      if (category === null) throw new RangeError('The reader answered no category');
      if (category.isArchived) throw new TransactionCategoryArchivedError();

      return (transaction, now) => {
        const reason = transaction.whyCannotTakeCategory(category);
        if (reason !== null) return reason;
        if (transaction.hasCategoryChosenBy(category.id)) return 'no_change';
        transaction.assignCategory(category, now);

        return null;
      };
    }

    if (action.type === 'addTag') {
      const [tag] = await this.references.tagsById([action.tagId], executor);
      if (tag === undefined) throw new RangeError('The reader answered no tag');
      if (tag.isArchived) throw new TransactionTagArchivedError();

      return (transaction, now) => (transaction.addTag(tag, now) ? null : 'no_change');
    }

    return (transaction, now) => {
      if (transaction.ignoredAt !== null) return 'no_change';
      transaction.ignore(now);

      return null;
    };
  }
}

export namespace BulkTransactionsUseCase {
  export type Input = TransactionBulk.Request;
  export type Output = TransactionBulk.Result;
}
