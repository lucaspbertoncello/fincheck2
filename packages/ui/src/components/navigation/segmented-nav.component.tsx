import { motion, MotionConfig } from 'motion/react';
import { useId } from 'react';
import { Link } from 'react-aria-components';

import { cx } from '#/utils/class-names.util.ts';

export type SegmentedNavItem = {
  key: string;
  label: string;
  href: string;
};

type SegmentedNavProps = {
  items: SegmentedNavItem[];
  activeKey: string;
  label: string;
  className?: string;
};

/**
 * Segmented control made of links (Recorrências | A pagar e receber, Categorias | Regras).
 * The white indicator slides between items (220 ms); it is a layout animation of the indicator
 * only, so it never fights with the page transition.
 */
export function SegmentedNav({ items, activeKey, label, className }: SegmentedNavProps) {
  const indicatorId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label={label}
        className={cx(
          'flex rounded-capsule border border-line bg-subtle p-s4 lg:inline-flex',
          className,
        )}
      >
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex min-h-ctl-touch flex-1 cursor-pointer items-center justify-center rounded-capsule px-s16 text-label font-emphasis whitespace-nowrap no-underline outline-none transition-colors duration-(--duration-fast) lg:min-h-ctl-tab',
                active ? 'text-fg-primary' : 'text-fg-tertiary data-[hovered]:text-fg-primary',
              )}
            >
              {active ? (
                <motion.span
                  layoutId={indicatorId}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-capsule bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)"
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                />
              ) : null}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
