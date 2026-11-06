import type { CategoryRule } from '#/modules/categories/domain/rule/category-rule.entity.ts';

// The ids of the rules older than `ruleId`, in the order the repository lists them (the oldest
// first). Without a rule (one not saved yet), all of them: a new rule is the youngest.
export function findOlderRuleIds(
  rulesOldestFirst: CategoryRule[],
  ruleId: string | null,
): Set<string> {
  const older = new Set<string>();
  for (const rule of rulesOldestFirst) {
    if (rule.id === ruleId) break;
    older.add(rule.id);
  }

  return older;
}
