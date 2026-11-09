import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';
import type { GetTagRefsQuery } from '#/modules/categories/application/tag/get-tag-refs.query.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';
import type { CategoryRuleRepository } from '#/modules/categories/domain/rule/category-rule-repository.interface.ts';

// The rules the import applies to the NEW transactions of a round (BR-CAT-004). It loads what the
// rules need once (the enabled rules, the categories and the tags they point to) and hands back a
// set that resolves each transaction in memory, so a first import of thousands of transactions
// never asks the database again. `sync` asks it through its own port, which this class satisfies.
//
// Resolving a transaction: the oldest enabled rule that matches and has a category that is not
// archived and has the kind of the transaction defines the category (and `ruleId`); a rule whose
// category is archived, of another kind, or that has only tags, defines none (N10) but its tags
// still count. The tags are the union, with no repeats, of the tags of every enabled rule that
// matches, the oldest rule first; an archived tag is dropped. Nothing to apply gives `null`.
export class LoadCategoryRuleSetQuery {
  private readonly db: Kysely<Database>;
  private readonly rules: CategoryRuleRepository<Kysely<Database>>;
  private readonly categoryRefs: GetCategoryRefsQuery;
  private readonly tagRefs: GetTagRefsQuery;

  constructor(
    db: Kysely<Database>,
    rules: CategoryRuleRepository<Kysely<Database>>,
    categoryRefs: GetCategoryRefsQuery,
    tagRefs: GetTagRefsQuery,
  ) {
    this.db = db;
    this.rules = rules;
    this.categoryRefs = categoryRefs;
    this.tagRefs = tagRefs;
  }

  async execute(executor: Kysely<Database> = this.db): Promise<LoadCategoryRuleSetQuery.RuleSet> {
    const enabledRules = (await this.rules.list(executor)).filter((rule) => rule.enabled);

    const categoryIds = enabledRules.flatMap((rule) =>
      rule.categoryId === null ? [] : [rule.categoryId],
    );
    const tagIds = enabledRules.flatMap((rule) => rule.tagIds);
    const [categories, tags] = await Promise.all([
      this.categoryRefs.requireCategories(categoryIds, executor),
      this.tagRefs.requireTags(tagIds, executor),
    ]);
    const activeTagIds = new Set(tags.filter((tag) => !tag.isArchived).map((tag) => tag.id));

    return {
      resolve: (candidate) => {
        let ruleId: string | null = null;
        let category: LoadCategoryRuleSetQuery.Resolution['category'] = null;
        const resolvedTagIds = new Set<string>();

        for (const rule of enabledRules) {
          if (!rule.matches(candidate)) continue;

          for (const tagId of rule.tagIds) {
            if (activeTagIds.has(tagId)) resolvedTagIds.add(tagId);
          }

          if (category !== null || rule.categoryId === null) continue;
          const ref = categories.get(rule.categoryId);
          if (ref && !ref.isArchived && ref.kind === candidate.nature) {
            ruleId = rule.id;
            category = ref;
          }
        }

        if (category === null && resolvedTagIds.size === 0) return null;

        return { ruleId, category, tagIds: [...resolvedTagIds] };
      },
    };
  }
}

export namespace LoadCategoryRuleSetQuery {
  export type Resolution = {
    // The rule that defined the category; null when only tags came out.
    ruleId: string | null;
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean } | null;
    tagIds: string[];
  };

  export type RuleSet = {
    // `null` when no enabled rule that matches gives a category or a tag.
    resolve(candidate: CategoryRule.Candidate): Resolution | null;
  };
}
