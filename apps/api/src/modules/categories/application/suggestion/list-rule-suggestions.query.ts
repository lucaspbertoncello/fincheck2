import type { RuleSuggestion } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { buildHistoryDefinition } from '#/modules/categories/application/rule/build-history-definition.util.ts';
import { findOlderRuleIds } from '#/modules/categories/application/rule/find-older-rule-ids.util.ts';
import type { RuleHistoryPreviewer } from '#/modules/categories/application/rule/rule-history-previewer.interface.ts';
import { parseTransactionIds } from '#/modules/categories/application/suggestion/parse-transaction-ids.util.ts';
import type { ManualCategorizationReader } from '#/modules/categories/application/suggestion/manual-categorization-reader.interface.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { findRuleSuggestions } from '#/modules/categories/domain/suggestion/find-rule-suggestions.util.ts';
import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';

// The "Sugerida" card and the question after recategorizing (RF-CAT-005), worked out when asked:
// nothing is born when Lucas recategorizes. Only his answers are stored. Each suggestion comes
// with what the rule it proposes would match and change in the history (N12).
export class ListRuleSuggestionsQuery {
  private readonly db: Kysely<Database>;
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly manualCategorizations: ManualCategorizationReader;
  private readonly history: RuleHistoryPreviewer;

  constructor(
    db: Kysely<Database>,
    rules: CategoryRuleRepository<Kysely<Database>>,
    manualCategorizations: ManualCategorizationReader,
    history: RuleHistoryPreviewer,
  ) {
    this.db = db;
    this.rules = rules;
    this.manualCategorizations = manualCategorizations;
    this.history = history;
  }

  async execute(input: ListRuleSuggestionsQuery.Input): Promise<ListRuleSuggestionsQuery.Output> {
    const transactionIds = parseTransactionIds(input.transactionIds);
    const manual = (await this.manualCategorizations.execute()).map((item) => ({
      transactionId: item.transactionId,
      pattern: normalizeDescription(item.description),
      categoryId: item.categoryId,
    }));
    if (manual.length === 0) return { items: [] };

    const categoryIds = [...new Set(manual.map((item) => item.categoryId))];
    const [categoryRows, decidedRows, allRules] = await Promise.all([
      this.db
        .selectFrom('categories')
        .select(['id', 'kind', 'archived_at'])
        .where('id', 'in', categoryIds)
        .execute(),
      this.db.selectFrom('rule_suggestions').select(['pattern', 'category_id']).execute(),
      this.rules.list(),
    ]);

    const found = findRuleSuggestions({
      manualCategorizations: manual,
      categories: new Map(
        categoryRows.map((row) => [
          row.id,
          { kind: row.kind, isArchived: row.archived_at !== null },
        ]),
      ),
      enabledRules: allRules.filter((rule) => rule.enabled),
      decided: decidedRows.map((row) => ({ pattern: row.pattern, categoryId: row.category_id })),
      transactionIds,
    });

    // A suggestion is a rule that does not exist yet: the youngest, so every rule is older.
    const olderRuleIds = findOlderRuleIds(allRules, null);
    const previews = await this.history.preview(
      found.map((suggestion) =>
        buildHistoryDefinition({
          condition: {
            descriptionContains: suggestion.pattern,
            counterpartyContains: null,
            kind: null,
            accountId: null,
            amountMinCents: null,
            amountMaxCents: null,
          },
          category: { id: suggestion.categoryId, kind: suggestion.kind, isArchived: false },
          tagIds: [],
          olderRuleIds,
        }),
      ),
    );

    return {
      items: found.map((suggestion, index) => ({
        pattern: suggestion.pattern,
        categoryId: suggestion.categoryId,
        kind: suggestion.kind,
        recategorizedCount: suggestion.recategorizedCount,
        matchCount: previews[index]?.matchCount ?? 0,
        willChangeCount: previews[index]?.willChangeCount ?? 0,
        examples: previews[index]?.examples ?? [],
      })),
    };
  }
}

export namespace ListRuleSuggestionsQuery {
  export type Input = RuleSuggestion.ListQuery;
  export type Output = { items: RuleSuggestion.Dto[] };
}
