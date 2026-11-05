import type { IconName } from '@fincheck/ui';

export type SettingsSectionKey = 'connections' | 'backup' | 'appearance';

export type SettingsSectionDefinition = {
  key: SettingsSectionKey;
  /** Route of the page of this section. */
  path: string;
  title: string;
  /** The line under the title of the page. */
  description: string;
  /** Used in the menu until the real subtitle (names of the connected banks) is known. */
  subtitle: string;
  icon: IconName;
};

export const SETTINGS_PATH = '/settings';

/** The pages of Configurações, by key. */
export const SETTINGS_SECTION: Record<SettingsSectionKey, SettingsSectionDefinition> = {
  connections: {
    key: 'connections',
    path: '/settings/connections',
    title: 'Conexões',
    description: 'Os bancos que o app lê sozinho pelo Open Finance.',
    subtitle: 'Open Finance e bancos',
    icon: 'plug',
  },
  backup: {
    key: 'backup',
    path: '/settings/backup',
    title: 'Backup',
    description: 'Uma cópia do banco por dia, na pasta que você escolher.',
    subtitle: 'Pasta, restaurar',
    icon: 'database',
  },
  appearance: {
    key: 'appearance',
    path: '/settings/appearance',
    title: 'Aparência',
    description: 'Como o app se mostra para você.',
    subtitle: 'Tema',
    icon: 'sun',
  },
};

/** The pages in the order of the menu. */
export const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  SETTINGS_SECTION.connections,
  SETTINGS_SECTION.backup,
  SETTINGS_SECTION.appearance,
];
