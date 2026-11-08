import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// The port to the store of rules: the root with its tags. `Executor` is the database handle: pass
// the one of a unit of work to read and write inside it.
export interface CategoryRuleRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<CategoryRule | null>;
  // Every rule, on or off, the oldest first (`createdAt`, then `id`): the oldest wins.
  list(executor?: Executor): Promise<CategoryRule[]>;
  // Creates or updates the rule, replacing its tags.
  save(rule: CategoryRule, executor?: Executor): Promise<void>;
  // The tags go with it; the transactions it categorized keep the category and lose the link.
  delete(id: string, executor?: Executor): Promise<void>;
  // Deletes the rules with a condition on the account (deleting the account), with their tags.
  deleteByAccount(accountId: string, executor?: Executor): Promise<void>;
}
