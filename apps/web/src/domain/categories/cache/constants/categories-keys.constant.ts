// Every cache key of the `categories` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const categoriesKeys = {
  all: ['categories'] as const,
  categories: (query: unknown) => ['categories', 'categories', query] as const,
  tags: (query: unknown) => ['categories', 'tags', query] as const,
  rules: () => ['categories', 'rules'] as const,
  rulePreview: (body: unknown) => ['categories', 'rules', 'preview', body] as const,
  ruleSuggestions: () => ['categories', 'rule-suggestions'] as const,
  ruleSuggestionList: (transactionIds: string) =>
    ['categories', 'rule-suggestions', transactionIds] as const,
};
