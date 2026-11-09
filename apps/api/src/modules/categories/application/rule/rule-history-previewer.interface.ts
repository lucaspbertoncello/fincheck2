import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// Port to "Bate com 14 transações do histórico". The owner of the history is `transactions`; the
// `main` plugs its query in. It does not write. One answer per definition, in the order they came.
export interface RuleHistoryPreviewer {
  preview(
    definitions: RuleHistoryPreviewer.Definition[],
    executor?: Kysely<Database>,
  ): Promise<Rule.Preview[]>;
}

export namespace RuleHistoryPreviewer {
  // A rule, as the history needs to see it. The matching is the one of `categories`, handed over as
  // a function, so there is a single one for the import, the preview and the history.
  export type Definition = {
    categoryId: string | null;
    // The kind of the category: a rule with a category only sees transactions of its kind.
    categoryKind: 'expense' | 'income' | null;
    // The category is a transfer between own accounts: what it takes becomes a `transfer`.
    categoryIsTransfer?: boolean;
    tagIds: string[];
    // The rules older than this one: what they categorized stays (N9). For a rule that is not
    // saved yet, all of them.
    olderRuleIds: ReadonlySet<string>;
    matches: (candidate: CategoryRule.Candidate) => boolean;
  };
}
