import {
  SUB_SCREEN_ORDER,
  TAB_ORDER,
} from '#/shared/layouts/application/transition/tab-order.constant.ts';
import { getScreenByPathname } from '#/shared/utils/get-screen-by-pathname.util.ts';

type LocationChange = {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
  pathChanged: boolean;
};

function getTabIndex(pathname: string): number {
  const tab = getScreenByPathname(pathname).tab;
  return tab ? TAB_ORDER.indexOf(tab) : -1;
}

/** Position of a pathname among the sub-tabs, or -1 when its screen has none. */
function getSubScreenIndex(pathname: string): number {
  const screen = getScreenByPathname(pathname);
  return screen.subNav ? SUB_SCREEN_ORDER.indexOf(screen.key) : -1;
}

function isSubTabChange(from: string, to: string): boolean {
  const fromScreen = getScreenByPathname(from);
  const toScreen = getScreenByPathname(to);
  return (
    fromScreen.subNav !== undefined &&
    fromScreen.subNav === toScreen.subNav &&
    fromScreen.key !== toScreen.key
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * View-transition types of a navigation (motion.md 1): `tab` + `fwd`/`back` between two different
 * tabs and between the two sub-tabs of a tab (Recorrências to A pagar e receber), `reduce`
 * instead of `tab` with reduced motion. First load, month changes, screens of the same tab
 * without sub-tabs and Configurações return false: no transition.
 */
export function getTabTransitionTypes({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): string[] | false {
  if (!fromLocation || !pathChanged) return false;
  const kind = prefersReducedMotion() ? 'reduce' : 'tab';

  const from = getTabIndex(fromLocation.pathname);
  const to = getTabIndex(toLocation.pathname);
  if (from < 0 || to < 0) return false;
  if (from !== to) return [kind, to > from ? 'fwd' : 'back'];

  if (!isSubTabChange(fromLocation.pathname, toLocation.pathname)) return false;
  const fromSub = getSubScreenIndex(fromLocation.pathname);
  const toSub = getSubScreenIndex(toLocation.pathname);
  return [kind, toSub > fromSub ? 'fwd' : 'back'];
}
