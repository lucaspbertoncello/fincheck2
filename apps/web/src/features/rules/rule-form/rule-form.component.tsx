import { useRuleFormViewModel } from '#/features/rules/rule-form/rule-form.viewmodel.tsx';
import { RuleFormView } from '#/features/rules/rule-form/rule-form.view.tsx';
import type {
  RuleFormOutcome,
  RuleFormTarget,
} from '#/features/rules/rule-form/types/rule-form.type.ts';

type RuleFormProps = {
  /** What to open; null keeps it closed. */
  target: RuleFormTarget | null;
  onClose: () => void;
  onSaved: (outcome: RuleFormOutcome) => void;
};

type OpenRuleFormProps = RuleFormProps & { target: RuleFormTarget };

function OpenRuleForm({ target, onClose, onSaved }: OpenRuleFormProps) {
  return <RuleFormView {...useRuleFormViewModel({ target, onClose, onSaved })} />;
}

/** The rule modal, mounted fresh for each target so the sentence never keeps an old draft. */
export function RuleForm({ target, onClose, onSaved }: RuleFormProps) {
  if (!target) return null;

  return (
    <OpenRuleForm
      key={target.mode === 'edit' ? target.rule.id : 'new'}
      target={target}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
