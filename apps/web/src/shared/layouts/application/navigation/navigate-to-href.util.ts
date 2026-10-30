import type { createAppRouter } from '#/router/create-router.util.tsx';

/** Bridges React Aria links (plain hrefs) to the TanStack router: path and search params. */
export function navigateToHref(router: ReturnType<typeof createAppRouter>, href: string): void {
  const url = new URL(href, window.location.origin);
  void router.navigate({
    to: url.pathname,
    search: Object.fromEntries(url.searchParams),
  } as never);
}
