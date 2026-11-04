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
 * shell draws (rail + panel): the shell stretches it to the height of the panel, and the icons
 * are one group centered in that height, so it reads as "icons in the middle" whatever the panel
 * height. Top to bottom: the logo, the five tabs with the sliding capsule
 * and Configurações, split by a hairline each. The "+" is not here: it floats at the bottom right
 * of the window (see `ApplicationLayout`). Same surface as the panel (`glass`).
 */
export function ApplicationRail({ screen, monthParam }: ApplicationRailProps) {
  const items = buildNavigationItems(monthParam);

  return (
    <nav
      aria-label="Principal"
      className="glass flex w-14 shrink-0 flex-col items-center justify-center gap-s4 p-s8"
    >
      <RailLogo homeHref={buildHref('/', monthParam)} />
      <RailDivider />
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
      <RailLink
        href={buildHref('/settings', monthParam)}
        label="Configurações"
        icon="settings"
        active={screen.key === 'settings'}
        turnsOnHover
      />
    </nav>
  );
}
