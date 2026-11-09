// Every cache key of the `accounts` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const accountsKeys = {
  all: ['accounts'] as const,
  listAll: ['accounts', 'list'] as const,
  list: (query: unknown) => ['accounts', 'list', query] as const,
  detail: (id: string) => ['accounts', 'detail', id] as const,
  balanceHistory: (id: string, month: string) =>
    ['accounts', 'balance-history', id, month] as const,
  deletionImpact: (id: string) => ['accounts', 'deletion-impact', id] as const,
};
