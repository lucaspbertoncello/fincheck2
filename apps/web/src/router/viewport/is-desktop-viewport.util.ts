/** Same breakpoint as `useIsDesktop`: from 1024 px up the app shows the rail and the two columns. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * True when the window is a desktop one. For code outside React (a `beforeLoad`), where the
 * `useIsDesktop` hook is not available. Without `matchMedia` (a test environment) it is false.
 */
export function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DESKTOP_QUERY).matches
    : false;
}
