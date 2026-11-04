import '#/shared/layouts/application/rail/rail.css';

import type { CSSProperties } from 'react';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { buildNavigationItems } from '#/shared/layouts/application/navigation/build-navigation-items.util.ts';
import { RailLink } from '#/shared/layouts/application/rail/rail-link.component.tsx';
import { RailLogo } from '#/shared/layouts/application/rail/rail-logo.component.tsx';
import { useRailOpen } from '#/shared/layouts/application/rail/use-rail-open.hook.ts';
import { ScreenPlus } from '#/shared/layouts/application/top-bar/screen-plus.component.tsx';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ApplicationRailProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
};

/**
 * Navigation of the desktop (1024 px and up): a rail of 56 px that opens to 232 px over the page.
 * Top to bottom: the logo, the "+" of the screen (a circle that grows into a pill with its name),
 * the five tabs with the sliding capsule, and Configurações at the foot. It takes the place of the
 * top tabs and of the top bar, so the panel and the page start at the top of the screen.
 *
 * The 72 px column of the shell is only the reserved room (the rail floats 12 px from the edge);
 * what opens is the rail, over the page.
 */
export function ApplicationRail({ screen, monthParam }: ApplicationRailProps) {
  const { open, railProps, setMenuOpen } = useRailOpen();
  const items = buildNavigationItems(monthParam);

  return (
    <div className="sticky top-0 z-(--z-menu) h-dvh w-18 shrink-0">
      <nav
        aria-label="Principal"
        data-open={open ? '' : undefined}
        className="rail absolute inset-y-s16 left-s12 rounded-panel backdrop-blur-(--blur-glass)"
        {...railProps}
      >
        <div className="flex h-full flex-col gap-s4 overflow-hidden rounded-[inherit] p-s8">
          <RailLogo homeHref={buildHref('/', monthParam)} />
          <ScreenPlus
            screen={screen}
            monthParam={monthParam}
            compact
            placement="right top"
            onMenuOpenChange={setMenuOpen}
          >
            <span className="rail-label pr-s16" style={{ '--rail-i': 1 } as CSSProperties}>
              {screen.plusLabel}
            </span>
          </ScreenPlus>
          <div aria-hidden="true" className="mx-s8 my-s8 h-px shrink-0 bg-line" />
          {items.map((item, index) => (
            <RailLink
              key={item.key}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.key === screen.tab}
              order={index + 2}
              slides
            />
          ))}
          <div className="mt-auto" />
          <RailLink
            href={buildHref('/settings', monthParam)}
            label="Configurações"
            icon="settings"
            active={screen.key === 'settings'}
            order={items.length + 2}
            turnsOnHover
          />
        </div>
      </nav>
    </div>
  );
}
