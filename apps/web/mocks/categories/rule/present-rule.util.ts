import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

export function presentRule(database: MockState.Database, record: MockState.RuleRecord): Rule.Dto {
  return {
    ...record,
    appliedCount: database.transactions.filter((tx) => tx.categoryRuleId === record.id).length,
  };
}
