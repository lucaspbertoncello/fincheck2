import { Section, SegmentedControl, SettingRow, type SegmentedOption } from '@fincheck/ui';

import { SettingsPageFrame } from '#/features/settings/settings/components/settings-page-frame.component.tsx';
import { SETTINGS_SECTION } from '#/features/settings/settings/constants/settings-sections.constant.ts';

const THEME_OPTIONS: SegmentedOption[] = [
  { key: 'light', label: 'Claro' },
  { key: 'dark', label: 'Escuro' },
  { key: 'system', label: 'Sistema' },
];

const PAGE = SETTINGS_SECTION.appearance;

type AppearanceViewProps = {
  value: string;
  onChange: (key: string) => void;
};

/**
 * "Aparência": the page for how the app looks, in groups. Today there is one, Tema (RNF-011); a
 * new group (density, language...) is one more `Section` in this column.
 */
export function AppearanceView({ value, onChange }: AppearanceViewProps) {
  return (
    <SettingsPageFrame title={PAGE.title} description={PAGE.description}>
      <Section title="Tema" divider={false}>
        <SettingRow
          label="Cores do app"
          description="Em Sistema, o app segue o tema do Windows."
          stackOnPhone
          control={
            <SegmentedControl
              label="Tema"
              options={THEME_OPTIONS}
              value={value}
              onChange={onChange}
            />
          }
        />
      </Section>
    </SettingsPageFrame>
  );
}
