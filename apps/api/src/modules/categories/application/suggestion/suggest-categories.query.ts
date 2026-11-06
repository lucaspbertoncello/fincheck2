import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ManualCategorizationReader } from '#/modules/categories/application/suggestion/manual-categorization-reader.interface.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';
import { suggestCategoriesForDescription } from '#/modules/categories/domain/suggestion/suggest-categories-for-description.util.ts';
import { normalizeDescription } from '#/shared/text/normalize-description.util.ts';

// "Parece Restaurantes" in the review queue: up to three categories for each transaction waiting,
// from what Lucas already did with that description and from the rules. `transactions` asks it
// through its `CategorySuggestionReader`, which this class satisfies.
export class SuggestCategoriesQuery {
  private readonly db: Kysely<Database>;
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly manualCategorizations: ManualCategorizationReader;

  constructor(
    db: Kysely<Database>,
    rules: CategoryRuleRepository<Kysely<Database>>,
    manualCategorizations: ManualCategorizationReader,
  ) {
    this.db = db;
    this.rules = rules;
    this.manualCategorizations = manualCategorizations;
  }

  async suggestionsFor(
    items: { transactionId: string; description: string; amountCents: number }[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, { categoryId: string; reason: 'history' | 'rule' }[]>> {
    const wanted = new Set(items.map((item) => item.description));
    const historyByDescription = new Map<string, Map<string, number>>();
    for (const item of await this.manualCategorizations.execute(executor)) {
      const description = normalizeDescription(item.description);
      if (!wanted.has(description)) continue;
      const counts = historyByDescription.get(description) ?? new Map<string, number>();
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
      historyByDescription.set(description, counts);
    }

    const enabledRules = (await this.rules.list(executor)).filter((rule) => rule.enabled);
    const categoryIds = new Set<string>(
      enabledRules.flatMap((rule) => (rule.categoryId === null ? [] : [rule.categoryId])),
    );
    for (const counts of historyByDescription.values()) {
      for (const categoryId of counts.keys()) categoryIds.add(categoryId);
    }
    const categoryRows =
      categoryIds.size === 0
        ? []
        : await executor
            .selectFrom('categories')
            .select(['id', 'kind', 'archived_at'])
            .where('id', 'in', [...categoryIds])
            .execute();
    const categories = new Map(
      categoryRows.map((row) => [row.id, { kind: row.kind, isArchived: row.archived_at !== null }]),
    );

    return new Map(
      items.map((item) => [
        item.transactionId,
        suggestCategoriesForDescription({
          description: item.description,
          amountCents: item.amountCents,
          historyCounts: historyByDescription.get(item.description) ?? new Map(),
          rules: enabledRules,
          categories,
        }),
      ]),
    );
  }
}
