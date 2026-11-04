import { SettingsNav, type SettingsNavItem } from '@fincheck/ui';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { SettingsNotes } from '#/features/settings/settings/components/settings-notes.component.tsx';

type SettingsViewProps = {
  isDesktop: boolean;
  /** Left column of the shell grid (desktop); the menu is portaled into it. */
  panelSlot: HTMLElement | null;
  navItems: SettingsNavItem[];
  /** The page on screen, or null on the list of the phone. */
  activeKey: string | null;
  /** The page of the route. */
  children: ReactNode;
};

/**
 * Configurações has no summary panel. On the desktop the shell leaves its left column empty and
 * the menu of the pages (the active one marked) and the two notes are portaled into it, so the
 * column and the content start where they do on every other screen. On the phone there is no
 * column: `/settings` is the list and each page comes alone, with the way back.
 */
export function SettingsView({
  isDesktop,
  panelSlot,
  navItems,
  activeKey,
  children,
}: SettingsViewProps) {
  return (
    <>
      {isDesktop && panelSlot
        ? createPortal(
            <div className="glass flex flex-col gap-s24 p-s24">
              <SettingsNav
                items={navItems}
                activeKey={activeKey ?? ''}
                label="Páginas de Configurações"
              />
              <SettingsNotes />
            </div>,
            panelSlot,
          )
        : null}
      <div className="min-w-0">{children}</div>
    </>
  );
}
