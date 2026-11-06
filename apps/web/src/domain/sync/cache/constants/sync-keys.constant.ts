// Every cache key of the `sync` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const syncKeys = {
  all: ['sync'] as const,
  settings: () => ['sync', 'settings'] as const,
  connections: () => ['sync', 'connections'] as const,
};
