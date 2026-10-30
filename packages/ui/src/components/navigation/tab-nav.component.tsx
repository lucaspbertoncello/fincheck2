import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { NavItem } from '#/components/navigation/nav-item.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type TabNavProps = {
  items: NavItem[];
  /** Key of the item that is the current page; it gets `aria-current="page"` and the indicator. */
  activeKey: string | null;
  label: string;
  className?: string;
};

/**
 * Top navigation: links with an icon and a sliding indicator. The indicator carries the
 * `tab-indicator` view-transition name, so it slides between tabs with the page transition.
 */
export function TabNav({ items, activeKey, label, className }: TabNavProps) {
  return (
    <nav aria-label={label} className={cx('hidden items-center gap-s24 lg:flex', className)}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative flex min-h-ctl-sm cursor-pointer items-center gap-s8 rounded-capsule px-s12 py-s8 text-label font-emphasis no-underline outline-none transition-colors duration-(--duration-fast)',
              'data-[hovered]:text-fg-primary',
              active ? 'text-fg-primary' : 'text-fg-secondary',
            )}
          >
            <Icon
              name={item.icon}
              size="md"
              className={active ? 'text-brand' : 'text-fg-secondary'}
            />
            {item.label}
            {active ? (
              <span
                aria-hidden="true"
                className="tab-indicator absolute inset-x-0 -bottom-s4 h-0.5 rounded-capsule bg-fg-primary"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
