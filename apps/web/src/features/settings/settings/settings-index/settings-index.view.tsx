import { SettingsNav, type SettingsNavItem } from '@fincheck/ui';

import { SettingsNotes } from '#/features/settings/settings/components/settings-notes.component.tsx';
import { SettingsPageFrame } from '#/features/settings/settings/components/settings-page-frame.component.tsx';

type SettingsIndexViewProps = {
  navItems: SettingsNavItem[];
};

/** Phone only: the list of the pages of Configurações, each one opens its own page. */
export function SettingsIndexView({ navItems }: SettingsIndexViewProps) {
  return (
    <SettingsPageFrame
      title="Configurações"
      description="Perfil, conexões, backup e aparência."
      showBack={false}
    >
      <div className="glass flex flex-col gap-s24 p-s16">
        <SettingsNav items={navItems} activeKey="" label="Páginas de Configurações" />
      </div>
      <SettingsNotes />
    </SettingsPageFrame>
  );
}
