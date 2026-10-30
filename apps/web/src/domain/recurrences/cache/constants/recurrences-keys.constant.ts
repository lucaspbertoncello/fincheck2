// Every cache key of the `recurrences` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const recurrencesKeys = {
  all: ['recurrences'] as const,
  lists: () => ['recurrences', 'list'] as const,
  list: (query: unknown) => ['recurrences', 'list', query] as const,
  summary: (month: string) => ['recurrences', 'summary', month] as const,
  detail: (id: string) => ['recurrences', 'detail', id] as const,
  preview: (body: unknown) => ['recurrences', 'preview', body] as const,
  occurrences: (query: unknown) => ['recurrences', 'occurrences', query] as const,
  occurrenceCandidates: (id: string) => ['recurrences', 'occurrence-candidates', id] as const,
};
