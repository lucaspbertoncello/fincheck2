import { SETTINGS_SECTION } from '#/shared/constants/settings/settings-sections.constant.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { buildNavigationItems } from '#/shared/layouts/application/navigation/build-navigation-items.util.ts';
import { RailLink } from '#/shared/layouts/application/rail/rail-link.component.tsx';
import { RailLogo } from '#/shared/layouts/application/rail/rail-logo.component.tsx';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ApplicationRailProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
};

function RailDivider() {
  return <div aria-hidden="true" className="mx-s8 my-s8 h-px shrink-0 self-stretch bg-line" />;
}

/**
 * Navigation of the desktop (1024 px and up): a rail of icons, 56 px wide, that never opens. The
 * name of each icon is a tip on hover and keyboard focus. It is the left half of the pair the
 * shell draws (rail + panel): the shell stretches it to the height of the panel. Three parts, top
 * to bottom: the logo pinned at the top, the six tabs (the five and Perfil, below Categorias)
 * with the sliding capsule between two hairlines, centered in the height, and Configurações pinned
 * at the bottom (it opens its first page, Conexões, straight away: the desktop has no list, and a
 * redirect hop would break the page transition). The logo and the gear have the same cell, so the
 * tabs stay in the middle. The "+" is not here: it floats at the bottom right of the window (see
 * `ApplicationLayout`). Same surface as the panel (`glass`).
 */
export function ApplicationRail({ screen, monthParam }: ApplicationRailProps) {
  const items = buildNavigationItems(monthParam);

  return (
    <nav
      aria-label="Principal"
      className="glass flex w-14 shrink-0 flex-col items-center justify-between p-s8"
    >
      <RailLogo homeHref={buildHref('/', monthParam)} />
      <div className="flex flex-col items-center gap-s4">
        <RailDivider />
        {items.map((item) => (
          <RailLink
            key={item.key}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.key === screen.tab}
            slides
          />
        ))}
        <RailDivider />
      </div>
      <RailLink
        href={buildHref(SETTINGS_SECTION.connections.path, monthParam)}
        label="Configurações"
        icon="settings"
        active={screen.key === 'settings'}
        slides
        turnsOnHover
      />
    </nav>
  );
}
