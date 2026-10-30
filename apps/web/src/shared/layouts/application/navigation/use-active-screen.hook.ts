import { useRouterState, useSearch } from '@tanstack/react-router';

import { getScreenByPathname } from '#/shared/utils/get-screen-by-pathname.util.ts';

/** The screen of the current URL and the month param (only when it is in the URL). */
export function useActiveScreen() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const search: { month?: string } = useSearch({ strict: false });
  return { screen: getScreenByPathname(pathname), monthParam: search.month };
}
