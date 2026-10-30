import { TAB_ORDER } from '#/shared/layouts/application/transition/tab-order.constant.ts';
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

/**
 * View-transition types of a navigation (motion.md 1): `tab` + `fwd`/`back` between two different
 * tabs, `reduce` instead of `tab` with reduced motion. First load, same tab (Recorrências to
 * A pagar e receber), month changes and Configurações return false: no transition.
 */
export function getTabTransitionTypes({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): string[] | false {
  if (!fromLocation || !pathChanged) return false;
  const from = getTabIndex(fromLocation.pathname);
  const to = getTabIndex(toLocation.pathname);
  if (from < 0 || to < 0 || from === to) return false;
  const reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return [reduce ? 'reduce' : 'tab', to > from ? 'fwd' : 'back'];
}
