import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { NavItem } from '#/components/navigation/nav-item.type.ts';

type BottomNavProps = {
  items: NavItem[];
  activeKey: string | null;
  label: string;
};

/**
 * Mobile bar: five equal items (20% each, 4 px side padding), icon over a 12 px / 500 label,
 * glass with blur and a line on top (components.md 1.2; ui adjustment 2).
 */
export function BottomNav({ items, activeKey, label }: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className="pb-safe fixed inset-x-0 bottom-0 z-(--z-menu) grid grid-cols-5 border-t border-line bg-(--color-surface-nav-mobile) backdrop-blur-(--blur-glass) lg:hidden"
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-bottom-nav min-w-0 cursor-pointer flex-col items-center justify-center gap-s4 px-s4 text-caption font-emphasis whitespace-nowrap no-underline outline-none ${
              active ? 'text-fg-primary' : 'text-fg-secondary'
            }`}
          >
            <Icon
              name={item.icon}
              size="lg"
              className={active ? 'text-brand' : 'text-fg-secondary'}
            />
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
