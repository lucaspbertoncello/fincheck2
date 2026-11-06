import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { classifyRuleEffect } from '#/modules/transactions/application/category-rule-history/classify-rule-effect.util.ts';
import type { LoadRuleHistoryCandidatesQuery } from '#/modules/transactions/application/category-rule-history/load-rule-history-candidates.query.ts';

// "Bate com 14 transações do histórico": for each rule definition, how many transactions it matches,
// how many applying it would change and three examples. Several definitions share one read of the
// history (the suggestions ask for all of them at once). Writes nothing. `categories` asks it
// through its `RuleHistoryPreviewer`, which this class satisfies.
export class PreviewRuleHistoryQuery {
  private readonly candidates: LoadRuleHistoryCandidatesQuery;

  constructor(candidates: LoadRuleHistoryCandidatesQuery) {
    this.candidates = candidates;
  }

  async preview(
    definitions: PreviewRuleHistoryQuery.Definition[],
    executor?: Kysely<Database>,
  ): Promise<PreviewRuleHistoryQuery.Output> {
    if (definitions.length === 0) return [];
    const candidates = await this.candidates.execute(executor);

    return definitions.map((definition) => {
      const effect = classifyRuleEffect(candidates, definition);

      return {
        matchCount: effect.matchCount,
        willChangeCount: effect.changes.length,
        examples: effect.examples,
      };
    });
  }
}

export namespace PreviewRuleHistoryQuery {
  export type Definition = classifyRuleEffect.Definition;
  // One answer per definition, in the same order.
  export type Output = Rule.Preview[];
}
