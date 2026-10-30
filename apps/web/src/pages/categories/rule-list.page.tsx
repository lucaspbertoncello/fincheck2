import { useRuleListViewModel } from '#/features/rules/rule-list/rule-list.viewmodel.tsx';
import { RuleListView } from '#/features/rules/rule-list/rule-list.view.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Categorias › Regras: header and sub-tabs from the shell, the rules from the feature. */
export function RuleListPage() {
  const viewModel = useRuleListViewModel();

  return (
    <ScreenFrame screen={SCREENS.rules}>
      <RuleListView {...viewModel} />
    </ScreenFrame>
  );
}
