import type { createAppRouter } from '#/router/create-router.util.tsx';

/**
 * Bridges React Aria links (plain hrefs) to the TanStack router: path, search params and anchor.
 * An anchor-only href (`#backup`) stays on the current screen and keeps its search.
 */
export function navigateToHref(router: ReturnType<typeof createAppRouter>, href: string): void {
  const url = new URL(href, window.location.href);
  void router.navigate({
    to: url.pathname,
    search: Object.fromEntries(url.searchParams),
    hash: url.hash ? url.hash.slice(1) : undefined,
  } as never);
}
