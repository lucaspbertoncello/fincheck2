import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { classifyRuleEffect } from '#/modules/transactions/application/category-rule-history/classify-rule-effect.util.ts';
import type { LoadRuleHistoryCandidatesQuery } from '#/modules/transactions/application/category-rule-history/load-rule-history-candidates.query.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// A category rule over the history (BR-CAT-006): recategorizes what it matches and Lucas, a
// recurrence, a bill or an older rule did not categorize, and adds its tags. Returns, for each
// transaction that changed, the state before, so "Desfazer" (`POST /transactions/bulk/restore`)
// can bring it back. It runs inside the unit of work of the caller (`categories`, creating or
// applying the rule): all or nothing. `categories` calls it through its `ApplyRuleToHistory`
// port, which this class satisfies.
export class ApplyRuleToHistoryUseCase {
  private readonly transactions: TransactionRepository<Kysely<Database>>;
  private readonly candidates: LoadRuleHistoryCandidatesQuery;
  private readonly clock: Clock;

  constructor(
    transactions: TransactionRepository<Kysely<Database>>,
    candidates: LoadRuleHistoryCandidatesQuery,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.candidates = candidates;
    this.clock = clock;
  }

  async execute(
    input: ApplyRuleToHistoryUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<ApplyRuleToHistoryUseCase.Output> {
    const now = this.clock.now();
    const { definition } = input;
    const effect = classifyRuleEffect(await this.candidates.execute(executor), definition);
    const found = await this.transactions.findByIds(
      effect.changes.map((candidate) => candidate.id),
      executor,
    );
    const category =
      definition.categoryId === null || definition.categoryKind === null
        ? null
        : { id: definition.categoryId, kind: definition.categoryKind, isArchived: false };

    const previous: TransactionBulk.PreviousState[] = [];
    for (const transaction of found) {
      const before = transaction.previousState();
      const changed = transaction.applyRule(
        { id: input.ruleId, category, tagIds: definition.tagIds },
        definition.olderRuleIds,
        now,
      );
      if (!changed) continue;
      previous.push(before);
      await this.transactions.save(transaction, executor);
    }

    return { changedCount: previous.length, previous };
  }
}

export namespace ApplyRuleToHistoryUseCase {
  export type Input = { ruleId: string; definition: classifyRuleEffect.Definition };
  export type Output = { changedCount: number; previous: TransactionBulk.PreviousState[] };
}
