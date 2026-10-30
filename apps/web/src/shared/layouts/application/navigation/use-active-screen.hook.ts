import { useRouterState, useSearch } from '@tanstack/react-router';

import { getScreenByPathname } from '#/shared/utils/get-screen-by-pathname.util.ts';

/**
 * The screen of the page that is on screen and the month param (only when it is in the URL).
 *
 * The pathname comes from the committed matches, not from `state.location`: the location changes
 * the instant a link is pressed, before the view transition captures the old page. Reading it
 * would move the tab indicator (and the sub-tabs) before the capture, so the old and the new
 * snapshot would have the indicator in the same place and nothing would slide. The matches change
 * inside the transition callback, in the same render as the new page.
 */
export function useActiveScreen() {
  const pathname = useRouterState({
    select: (state) => state.matches.at(-1)?.pathname ?? state.location.pathname,
  });
  const search: { month?: string } = useSearch({ strict: false });
  return { screen: getScreenByPathname(pathname), monthParam: search.month };
}
