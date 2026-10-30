// Every cache key of the `bills` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const billsKeys = {
  all: ['bills'] as const,
  list: (query: unknown) => ['bills', 'list', query] as const,
  counterparties: () => ['bills', 'counterparties'] as const,
  detail: (id: string) => ['bills', 'detail', id] as const,
  paymentCandidates: (id: string) => ['bills', 'payment-candidates', id] as const,
  paymentCandidatesBy: (query: unknown) => ['bills', 'payment-candidates', 'by', query] as const,
};
