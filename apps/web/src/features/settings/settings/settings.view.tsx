import { FineNote, SettingsNav, type SettingsNavItem } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { RouterProvider } from 'react-aria-components';

import { ScreenHeader } from '#/shared/components/page/screen-header.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

type SettingsViewProps = {
  isDesktop: boolean;
  navItems: SettingsNavItem[];
  activeKey: string;
  /** Receives the `href` of a side menu link (a hash). */
  onNavigate: (href: string) => void;
  /** Each section sits in an element with this prefix plus its key as id. */
  sectionIdPrefix: string;
  connections: ReactNode;
  backup: ReactNode;
  appearance: ReactNode;
};

function Notes() {
  return (
    <div className="flex flex-col gap-s12">
      <FineNote icon="lock">Tokens e chaves ficam criptografados neste PC.</FineNote>
      <p className="text-meta text-fg-secondary">
        Ícones Solar, de 480 Design, sob licença CC BY 4.0.
      </p>
    </div>
  );
}

/**
 * Configurações: no summary panel. On the desktop the left column is the list of the sections and
 * the two notes (ui adjustment 13: it does not repeat the page title); on the phone the sections
 * stack in a column and the notes close the page.
 */
export function SettingsView({
  isDesktop,
  navItems,
  activeKey,
  onNavigate,
  sectionIdPrefix,
  connections,
  backup,
  appearance,
}: SettingsViewProps) {
  return (
    <div className="grid gap-s24 lg:grid-cols-[var(--spacing-panel)_minmax(0,1fr)] lg:items-start">
      {isDesktop ? (
        <aside className="glass sticky top-s16 flex flex-col gap-s24 p-s24">
          <RouterProvider navigate={onNavigate}>
            <SettingsNav items={navItems} activeKey={activeKey} label="Seções de Configurações" />
          </RouterProvider>
          <Notes />
        </aside>
      ) : null}
      <div className="flex min-w-0 flex-col gap-s16 lg:gap-s24">
        <ScreenHeader screen={SCREENS.settings} />
        <div id={`${sectionIdPrefix}connections`} className="scroll-mt-s16">
          {connections}
        </div>
        <div className="grid items-start gap-s16 lg:grid-cols-2 lg:gap-s24">
          <div id={`${sectionIdPrefix}backup`} className="scroll-mt-s16">
            {backup}
          </div>
          <div id={`${sectionIdPrefix}appearance`} className="scroll-mt-s16">
            {appearance}
          </div>
        </div>
        {isDesktop ? null : <Notes />}
      </div>
    </div>
  );
}
