import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { SettingsNavItem } from '#/components/settings/settings-nav-item.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type SettingsNavProps = {
  items: SettingsNavItem[];
  activeKey: string;
  /** Accessible name of the navigation ("Seções de Configurações"). */
  label: string;
  className?: string;
};

/**
 * Side menu of Configurações (components.md 15), only the list of sections: the screen puts it in
 * the left panel and does not repeat the page title there (ui adjustment 13). Each item is a link,
 * 56 px minimum, icon with title and subtitle; the active one has the weak accent fill. The fill
 * is its own view-transition group (`settings-ind`): it slides from the old item to the new one
 * with the page transition, as the capsule of the rail and the pill of the sub-tabs do (the menu
 * stays mounted while the pages change, so the browser has both positions to glide between).
 */
export function SettingsNav({ items, activeKey, label, className }: SettingsNavProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col gap-s4">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'focus-ring relative flex min-h-14 items-center gap-s12 rounded-input px-s12 py-s8 no-underline',
                  'transition-colors duration-(--duration-fast) ease-(--ease-standard)',
                  !active && 'data-[hovered]:bg-subtle',
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    data-settings-ind
                    className="absolute inset-0 rounded-input bg-brand-weak [view-transition-name:settings-ind]"
                  />
                ) : null}
                <Icon
                  name={item.icon}
                  size="base"
                  className={cx('relative', active ? 'text-brand' : 'text-fg-secondary')}
                />
                <span className="relative flex min-w-0 flex-col">
                  <span className="truncate text-list font-emphasis text-fg-primary">
                    {item.title}
                  </span>
                  <span className="truncate text-meta text-fg-secondary">{item.subtitle}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
