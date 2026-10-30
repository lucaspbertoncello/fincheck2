import { useThemePreference } from '#/features/settings/settings/appearance/hooks/use-theme-preference.hook.ts';

/** The theme lives in the browser, not on the server: this section has no query. */
export function useAppearanceModel() {
  return useThemePreference();
}
