import { useAppearanceModel } from '#/features/settings/settings/appearance/appearance.model.ts';
import { AppearanceView } from '#/features/settings/settings/appearance/appearance.view.tsx';
import type { ThemePreference } from '#/shared/stores/theme.store.ts';

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system'];

function isThemePreference(value: string): value is ThemePreference {
  return PREFERENCES.some((preference) => preference === value);
}

/** Adapts the saved theme to the segmented control of the section. */
export function AppearanceViewModel() {
  const { preference, choose } = useAppearanceModel();

  return (
    <AppearanceView
      value={preference}
      onChange={(key) => {
        if (isThemePreference(key)) choose(key);
      }}
    />
  );
}
