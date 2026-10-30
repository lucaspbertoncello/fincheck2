import { useRuleSuggestionViewModel } from '#/features/rules/rule-suggestion/rule-suggestion.viewmodel.tsx';
import { RuleSuggestionView } from '#/features/rules/rule-suggestion/rule-suggestion.view.tsx';

/** The suggestion cards of the Regras screen, wired to their own state. */
export function RuleSuggestions() {
  return <RuleSuggestionView {...useRuleSuggestionViewModel()} />;
}
