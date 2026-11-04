import {
  SETTINGS_LIST_INDEX,
  SETTINGS_PAGE_ORDER,
  SUB_SCREEN_ORDER,
  TAB_ORDER,
} from '#/shared/layouts/application/transition/tab-order.constant.ts';
import { getScreenByPathname } from '#/shared/utils/get-screen-by-pathname.util.ts';

type LocationChange = {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
  pathChanged: boolean;
};

/**
 * Position of a pathname in the row of tabs. Configurações comes after the last tab: the rail
 * puts it at the foot, below Categorias, so entering it from any tab moves forward and leaving
 * it moves back.
 */
function getTabIndex(pathname: string): number {
  const screen = getScreenByPathname(pathname);
  if (screen.key === 'settings') return TAB_ORDER.length;
  return screen.tab ? TAB_ORDER.indexOf(screen.tab) : -1;
}

function isSettings(pathname: string): boolean {
  return getScreenByPathname(pathname).key === 'settings';
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

/**
 * Position of a pathname among the Configurações pages, or -1 outside Configurações. The list of
 * the phone (`/settings`) comes before the first page.
 */
function getSettingsPageIndex(pathname: string): number {
  const page = SETTINGS_PAGE_ORDER.findIndex((candidate) => pathname.startsWith(candidate));
  if (page >= 0) return page;
  return isSettings(pathname) ? SETTINGS_LIST_INDEX : -1;
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
 * without sub-tabs return false: no transition. Configurações is the position after the last tab
 * (type `edge` added when entering or leaving it). Its pages slide like sub-tabs, in the order of
 * their side menu; on the phone the list comes before the first page.
 */
export function getTabTransitionTypes({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): string[] | false {
  if (!fromLocation || !pathChanged) return false;
  const kind = prefersReducedMotion() ? 'reduce' : 'tab';

  const fromSettings = getSettingsPageIndex(fromLocation.pathname);
  const toSettings = getSettingsPageIndex(toLocation.pathname);
  if (fromSettings !== -1 && toSettings !== -1 && fromSettings !== toSettings)
    return [kind, toSettings > fromSettings ? 'fwd' : 'back'];

  const from = getTabIndex(fromLocation.pathname);
  const to = getTabIndex(toLocation.pathname);
  if (from < 0 || to < 0) return false;
  if (from !== to) {
    const direction = to > from ? 'fwd' : 'back';
    // `edge`: entering or leaving Configurações, where the left column changes kind.
    const edge = isSettings(fromLocation.pathname) || isSettings(toLocation.pathname);
    return edge ? [kind, direction, 'edge'] : [kind, direction];
  }

  if (!isSubTabChange(fromLocation.pathname, toLocation.pathname)) return false;
  const fromSub = getSubScreenIndex(fromLocation.pathname);
  const toSub = getSubScreenIndex(toLocation.pathname);
  return [kind, toSub > fromSub ? 'fwd' : 'back'];
}
