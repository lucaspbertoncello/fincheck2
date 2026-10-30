import { useMediaQuery } from '@fincheck/ui';

/** True from 1024 px up, where the app shows the top tabs and the two panels side by side. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
