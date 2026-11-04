import type { SettingsNavItem } from '@fincheck/ui';

import { SETTINGS_SECTIONS } from '#/features/settings/settings/constants/settings-sections.constant.ts';
import { useSettingsModel } from '#/features/settings/settings/settings.model.ts';
import { joinNames } from '#/features/settings/settings/utils/join-names.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

/** The four entries of the Configurações menu (desktop column and phone list), with their summary. */
export function useSettingsNavItems(): SettingsNavItem[] {
  const { connections, profile } = useSettingsModel();
  const { monthParam } = useActiveScreen();

  const bankNames = (connections.data?.items ?? [])
    .filter((connection) => connection.status !== 'disconnected')
    .map((connection) => connection.institutionName);

  return SETTINGS_SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    subtitle:
      section.key === 'connections' && bankNames.length > 0
        ? `Open Finance, ${joinNames(bankNames)}`
        : section.key === 'profile' && profile.data
          ? profile.data.name
          : section.subtitle,
    icon: section.icon,
    href: buildHref(section.path, monthParam),
  }));
}
