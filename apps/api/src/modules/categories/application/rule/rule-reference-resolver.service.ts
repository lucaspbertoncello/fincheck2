import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { GetCategoryRefsQuery } from '#/modules/categories/application/category/get-category-refs.query.ts';
import type { RuleAccountReader } from '#/modules/categories/application/rule/rule-account-reader.interface.ts';
import type { GetTagRefsQuery } from '#/modules/categories/application/tag/get-tag-refs.query.ts';
import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// Resolves what the ids of a rule point to: the account of the condition (`accounts` answers),
// the category of the action and its tags. Each throws the not-found error of its owner.
export class RuleReferenceResolver {
  private readonly categories: GetCategoryRefsQuery;
  private readonly tags: GetTagRefsQuery;
  private readonly accounts: RuleAccountReader;

  constructor(
    categories: GetCategoryRefsQuery,
    tags: GetTagRefsQuery,
    accounts: RuleAccountReader,
  ) {
    this.categories = categories;
    this.tags = tags;
    this.accounts = accounts;
  }

  async account(accountId: string | null, executor?: Kysely<Database>): Promise<void> {
    if (accountId !== null) await this.accounts.requireAccount(accountId, executor);
  }

  async category(
    categoryId: string | null,
    executor?: Kysely<Database>,
  ): Promise<CategoryRule.CategoryRef | null> {
    if (categoryId === null) return null;
    const found = await this.categories.requireCategories([categoryId], executor);

    return found.get(categoryId) ?? null;
  }

  async tagsOf(tagIds: string[], executor?: Kysely<Database>): Promise<CategoryRule.TagRef[]> {
    return this.tags.requireTags(tagIds, executor);
  }
}
