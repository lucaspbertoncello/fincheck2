import { useEffect } from 'react';

import { followSystemTheme, getThemePreference } from '#/shared/stores/theme.store.ts';

/** Starts at the app: while the preference is "Sistema", the theme follows the OS from the start. */
export function useFollowSystemTheme() {
  useEffect(() => {
    if (getThemePreference() === 'system') followSystemTheme();
  }, []);
}
