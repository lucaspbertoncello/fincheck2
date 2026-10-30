import { MotionConfig } from 'motion/react';
import { useId } from 'react';
import { Link } from 'react-aria-components';

import { SegmentedIndicator } from '#/components/forms/segmented-indicator.component.tsx';
import {
  SEGMENTED_ITEM_ACTIVE_CLASS,
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_ITEM_INACTIVE_CLASS,
  SEGMENTED_TRACK_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
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
      <nav aria-label={label} className={cx(SEGMENTED_TRACK_CLASS, 'lg:inline-flex', className)}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                SEGMENTED_ITEM_CLASS,
                active ? SEGMENTED_ITEM_ACTIVE_CLASS : SEGMENTED_ITEM_INACTIVE_CLASS,
              )}
            >
              {active ? <SegmentedIndicator layoutId={indicatorId} /> : null}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
