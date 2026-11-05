import { Logo, SettingsLink, TopBar } from '@fincheck/ui';
import { Link } from 'react-aria-components';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { ProfileLink } from '#/shared/layouts/application/top-bar/profile-link.component.tsx';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ApplicationTopBarProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
};

/** Top bar of the phone: logo, Perfil and the settings gear (the "+" floats at the bottom right, see `ApplicationLayout`). The tabs are in the bottom bar. */
export function ApplicationTopBar({ screen, monthParam }: ApplicationTopBarProps) {
  return (
    <TopBar
      logo={
        <Link
          href={buildHref('/', monthParam)}
          aria-label="Fincheck, Visão geral"
          className="shrink-0 rounded-input outline-none"
        >
          <span data-logo-slot className="block">
            <Logo />
          </span>
        </Link>
      }
      actions={
        <>
          <ProfileLink
            href={buildHref('/profile', monthParam)}
            label="Perfil"
            active={screen.key === 'profile'}
          />
          <SettingsLink
            href={buildHref('/settings', monthParam)}
            label="Configurações"
            active={screen.key === 'settings'}
          />
        </>
      }
    />
  );
}
