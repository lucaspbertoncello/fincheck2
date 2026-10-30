import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { CategoryOption } from '@fincheck/ui';

/** What the rule modal does: create a rule or edit one. */
export type RuleFormTarget = { mode: 'create' } | { mode: 'edit'; rule: Rule.Dto };

/** What the modal tells the screen after saving, so the screen can show the right undo toast. */
export type RuleFormOutcome = {
  rule: Rule.Dto;
  /** Set when the rule was applied to the history together with the save. */
  applied: Rule.ApplyResult | null;
  created: boolean;
  /** Name of the category the rule puts, null when it only adds tags. */
  categoryName: string | null;
};

export type RuleFormErrors = {
  description?: string;
  action?: string;
};

/** The categories the picker offers, one group per type. */
export type CategoryGroup = {
  label: string;
  options: CategoryOption[];
};

export type AccountOption = {
  id: string;
  name: string;
};

export type TagOption = {
  id: string;
  name: string;
};
