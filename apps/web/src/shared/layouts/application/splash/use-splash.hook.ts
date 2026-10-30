import { useEffect } from 'react';

import { runSplash } from '#/shared/layouts/application/splash/run-splash.util.ts';

/** Starts the splash exit once the top bar (and so the logo slot) is on the screen. */
export function useSplash(): void {
  useEffect(() => {
    runSplash();
  }, []);
}
