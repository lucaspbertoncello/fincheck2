import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The category and the tags the rules of `categories` gave to the new transactions of a round
// (BR-CAT-004). The rules already ran in `categories`, in memory; this only writes, through
// `Transaction.applyRule`, which never touches a transaction that is split, ignored, outside
// expense and income, or that already has a category from Lucas, a recurrence or a bill. Runs inside
// the unit of work of the round, with its executor.
export class ApplyImportRulesUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(transactions: TransactionRepository<Kysely<Database>>, clock: Clock) {
    this.transactions = transactions;
    this.clock = clock;
  }

  async execute(
    input: ApplyImportRulesUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ApplyImportRulesUseCase.Output> {
    const now = this.clock.now();
    const byId = new Map(
      (
        await this.transactions.findByIds(
          input.items.map((item) => item.transactionId),
          executor,
        )
      ).map((transaction) => [transaction.id, transaction]),
    );
    let changedCount = 0;

    for (const item of input.items) {
      const transaction = byId.get(item.transactionId);
      if (!transaction) continue;
      const changed = transaction.applyRule(
        // A category with no rule behind it cannot be recorded (the origin of a category is its
        // rule): only the tags are taken.
        {
          id: item.ruleId ?? '',
          category: item.ruleId === null ? null : item.category,
          tagIds: item.tagIds,
        },
        new Set(),
        now,
      );
      if (!changed) continue;
      await this.transactions.save(transaction, executor);
      changedCount += 1;
    }

    return { changedCount };
  }
}

export namespace ApplyImportRulesUseCase {
  export type Item = {
    transactionId: string;
    // The rule that defined the category; null when only tags came out.
    ruleId: string | null;
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean } | null;
    tagIds: string[];
  };

  export type Input = { items: Item[] };
  export type Output = { changedCount: number };
}
