import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** One section of the settings side menu ("Conexões", "Backup", "Aparência"). */
export type SettingsNavItem = {
  key: string;
  title: string;
  /** Line under the title ("Pluggy, Nubank e Bradesco"). */
  subtitle: string;
  icon: IconName;
  href: string;
};
