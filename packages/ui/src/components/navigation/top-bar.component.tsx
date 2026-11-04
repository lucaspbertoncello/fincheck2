import type { ReactNode } from 'react';

type TopBarProps = {
  logo: ReactNode;
  /** The settings gear. */
  actions: ReactNode;
};

/**
 * Top bar of the phone: logo, a gap, then the gear (56 px). On the desktop the side
 * rail takes all of this.
 */
export function TopBar({ logo, actions }: TopBarProps) {
  return (
    <header className="flex h-topbar-mobile items-center gap-s24 px-gutter-mobile">
      {logo}
      <div className="ml-auto flex items-center gap-s8">{actions}</div>
    </header>
  );
}
