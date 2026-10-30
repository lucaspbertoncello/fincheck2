// Every cache key of the `invoices` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const invoicesKeys = {
  all: ['invoices'] as const,
  open: () => ['invoices', 'open'] as const,
  list: (accountId: string, query: unknown) => ['invoices', 'list', accountId, query] as const,
  detail: (accountId: string, month: string) => ['invoices', 'detail', accountId, month] as const,
};
