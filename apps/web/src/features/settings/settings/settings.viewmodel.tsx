import type { SettingsNavItem } from '@fincheck/ui';
import { useState } from 'react';

import { AppearanceViewModel } from '#/features/settings/settings/appearance/appearance.viewmodel.tsx';
import { BackupViewModel } from '#/features/settings/settings/backup/backup.viewmodel.tsx';
import { ConnectionsViewModel } from '#/features/settings/settings/connections/connections.viewmodel.tsx';
import {
  SETTINGS_SECTIONS,
  type SettingsSectionKey,
} from '#/features/settings/settings/constants/settings-sections.constant.ts';
import { getSectionFromHash } from '#/features/settings/settings/utils/get-section-from-hash.util.ts';
import { joinNames } from '#/features/settings/settings/utils/join-names.util.ts';
import { useSettingsModel } from '#/features/settings/settings/settings.model.ts';
import { SettingsView } from '#/features/settings/settings/settings.view.tsx';
import { useIsDesktop } from '#/shared/hooks/use-is-desktop.hook.ts';

export const SECTION_ID_PREFIX = 'settings-';

/** Screen of Configurações: the side menu (desktop) and the three sections, the section in the URL hash. */
export function SettingsViewModel() {
  const { connections } = useSettingsModel();
  const isDesktop = useIsDesktop();
  const [activeKey, setActiveKey] = useState<SettingsSectionKey>(() =>
    getSectionFromHash(window.location.hash),
  );

  const bankNames = (connections.data?.items ?? [])
    .filter((connection) => connection.status !== 'disconnected')
    .map((connection) => connection.institutionName);

  const navItems: SettingsNavItem[] = SETTINGS_SECTIONS.map((section) => ({
    key: section.key,
    title: section.title,
    subtitle:
      section.key === 'connections' && bankNames.length > 0
        ? `Pluggy, ${joinNames(bankNames)}`
        : section.subtitle,
    icon: section.icon,
    href: `#${section.key}`,
  }));

  // The side menu links are hashes: they move to the section instead of changing the route.
  function goToSection(href: string) {
    const key = getSectionFromHash(href.slice(href.indexOf('#')));
    setActiveKey(key);
    window.history.replaceState(window.history.state, '', `#${key}`);
    document.getElementById(`${SECTION_ID_PREFIX}${key}`)?.scrollIntoView({ block: 'start' });
  }

  return (
    <SettingsView
      isDesktop={isDesktop}
      navItems={navItems}
      activeKey={activeKey}
      onNavigate={goToSection}
      sectionIdPrefix={SECTION_ID_PREFIX}
      connections={<ConnectionsViewModel />}
      backup={<BackupViewModel />}
      appearance={<AppearanceViewModel />}
    />
  );
}
