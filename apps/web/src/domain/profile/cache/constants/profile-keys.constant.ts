// Every cache key of the `profile` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const profileKeys = {
  all: ['profile'] as const,
  current: () => ['profile', 'current'] as const,
};
