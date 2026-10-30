import type { ReactNode } from 'react';

type TopBarProps = {
  logo: ReactNode;
  /** The five tabs (desktop only). */
  navigation: ReactNode;
  /** Settings gear and the "+" button. */
  actions: ReactNode;
};

/** Top bar: logo, tabs, a gap, then the gear and the "+" (68 px; 56 px on mobile). */
export function TopBar({ logo, navigation, actions }: TopBarProps) {
  return (
    <header className="flex h-topbar-mobile items-center gap-s24 px-gutter-mobile lg:h-topbar lg:px-gutter">
      {logo}
      {navigation}
      <div className="ml-auto flex items-center gap-s8">{actions}</div>
    </header>
  );
}
