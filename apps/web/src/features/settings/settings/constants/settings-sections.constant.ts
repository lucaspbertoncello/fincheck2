import type { IconName } from '@fincheck/ui';

export type SettingsSectionKey = 'connections' | 'backup' | 'appearance';

type SettingsSectionDefinition = {
  key: SettingsSectionKey;
  title: string;
  /** Used until the real subtitle (names of the connected banks) is known. */
  subtitle: string;
  icon: IconName;
};

/** The sections of Configurações, in the order of the side menu and of the page. */
export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  { key: 'connections', title: 'Conexões', subtitle: 'Pluggy e bancos', icon: 'plug' },
  { key: 'backup', title: 'Backup', subtitle: 'Pasta, restaurar', icon: 'database' },
  { key: 'appearance', title: 'Aparência', subtitle: 'Tema', icon: 'sun' },
];
