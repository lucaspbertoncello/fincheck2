import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryRuleReader } from '#/modules/transactions/application/transaction/category-rule-reader.interface.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desfazer" of a bulk action, of a rule applied to the history and of a recategorization: writes
// back, over the whole state, what the action had returned in `previous`. A rule deleted meanwhile
// leaves no id, and a transaction that no longer exists is skipped and not counted.
export class RestoreBulkTransactionsUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly rules: CategoryRuleReader;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    rules: CategoryRuleReader,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.rules = rules;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(
    input: RestoreBulkTransactionsUseCase.Input,
  ): Promise<RestoreBulkTransactionsUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const found = new Map(
        (
          await this.transactions.findByIds(
            input.items.map((item) => item.transactionId),
            executor,
          )
        ).map((transaction) => [transaction.id, transaction]),
      );
      const aliveRules = await this.rules.existingRuleIds(
        [...new Set(input.items.flatMap((item) => item.categoryRuleId ?? []))],
        executor,
      );

      let restoredCount = 0;
      for (const item of input.items) {
        const transaction = found.get(item.transactionId);
        if (!transaction) continue;

        transaction.restoreState(
          item,
          { ruleStillExists: item.categoryRuleId !== null && aliveRules.has(item.categoryRuleId) },
          now,
        );
        await this.transactions.save(transaction, executor);
        restoredCount += 1;
      }

      return { restoredCount };
    });
  }
}

export namespace RestoreBulkTransactionsUseCase {
  export type Input = TransactionBulk.RestoreRequest;
  export type Output = TransactionBulk.RestoreResult;
}
