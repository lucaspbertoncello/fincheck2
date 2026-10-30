// Every cache key of the `transactions` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const transactionsKeys = {
  all: ['transactions'] as const,
  lists: () => ['transactions', 'list'] as const,
  list: (query: unknown) => ['transactions', 'list', query] as const,
  infinite: (query: unknown) => ['transactions', 'list', 'infinite', query] as const,
  summary: (month: string) => ['transactions', 'summary', month] as const,
  reviewQueue: (query: unknown) => ['transactions', 'review-queue', query] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
  installmentPlans: (query: unknown) => ['transactions', 'installment-plans', query] as const,
};
