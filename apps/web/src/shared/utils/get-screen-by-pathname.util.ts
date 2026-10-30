import { SCREENS } from '#/shared/constants/screens.constant.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

/** The screen of a pathname; the deepest path wins (`/recurrences/bills` before `/recurrences`). */
export function getScreenByPathname(pathname: string): ScreenDefinition {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const matches = Object.values(SCREENS)
    .filter((screen) => (screen.path === '/' ? clean === '/' : clean.startsWith(screen.path)))
    .sort((a, b) => b.path.length - a.path.length);
  return matches[0] ?? SCREENS.overview;
}
