// Every cache key of the `backup` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const backupKeys = {
  all: ['backup'] as const,
  status: () => ['backup', 'status'] as const,
  files: () => ['backup', 'files'] as const,
};
