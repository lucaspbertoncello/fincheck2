import { useRouter } from '@tanstack/react-router';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { PLUS_ACTION_PATHS } from '#/shared/layouts/application/top-bar/plus-menu-items.constant.ts';

/** Goes to the screen that owns the modal of a "+" action, keeping the selected month. */
export function usePlusAction(monthParam: string | undefined) {
  const router = useRouter();

  return function handlePlusAction(key: string) {
    const path = PLUS_ACTION_PATHS[key];
    if (path) navigateToHref(router, buildHref(path, monthParam));
  };
}
