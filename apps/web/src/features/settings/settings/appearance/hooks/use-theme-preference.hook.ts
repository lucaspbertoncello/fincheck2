import { useEffect, useState } from 'react';

import {
  followSystemTheme,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '#/shared/stores/theme.store.ts';

/** The theme choice (Claro, Escuro, Sistema) and its setter; "Sistema" keeps following the OS. */
export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(() => getThemePreference());

  useEffect(() => {
    if (preference === 'system') followSystemTheme();
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    setThemePreference(next);
  }

  return { preference, choose };
}
