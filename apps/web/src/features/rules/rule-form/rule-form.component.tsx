import { useRuleFormViewModel } from '#/features/rules/rule-form/rule-form.viewmodel.tsx';
import { RuleFormView } from '#/features/rules/rule-form/rule-form.view.tsx';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { RuleFormOutcome, RuleFormTarget } from '#/features/rules/types/rule-form.type.ts';

type RuleFormProps = {
  /** What to open; null keeps it closed. */
  target: RuleFormTarget | null;
  onClose: () => void;
  onSaved: (outcome: RuleFormOutcome) => void;
  onDelete?: (rule: Rule.Dto) => void;
};

type OpenRuleFormProps = RuleFormProps & { target: RuleFormTarget };

function OpenRuleForm(props: OpenRuleFormProps) {
  return <RuleFormView {...useRuleFormViewModel(props)} />;
}

/** The rule modal, mounted fresh for each target so the sentence never keeps an old draft. */
export function RuleForm({ target, ...handlers }: RuleFormProps) {
  if (!target) return null;

  return (
    <OpenRuleForm
      key={target.mode === 'edit' ? target.rule.id : 'new'}
      target={target}
      {...handlers}
    />
  );
}
