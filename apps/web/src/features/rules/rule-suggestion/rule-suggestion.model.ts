import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useAcceptRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-accept-rule-suggestion.hook.ts';
import { useDismissRuleSuggestion } from '#/domain/categories/rule-suggestion/hooks/use-dismiss-rule-suggestion.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { useRuleSuggestionFeed } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestion-feed.hook.ts';

/** What the suggestion cards read and write: the suggestions, the names to show and the two answers. */
export function useRuleSuggestionModel() {
  return {
    suggestions: useRuleSuggestionFeed(),
    categories: useCategories({ status: 'all' }),
    tags: useTags({ includeArchived: true }),
    accept: useAcceptRuleSuggestion(),
    dismiss: useDismissRuleSuggestion(),
  };
}
