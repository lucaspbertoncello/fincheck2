import { MotionConfig } from 'motion/react';
import { Link } from 'react-aria-components';

import { SegmentedIndicator } from '#/components/forms/segmented-indicator.component.tsx';
import {
  SEGMENTED_ITEM_ACTIVE_CLASS,
  SEGMENTED_ITEM_COMPACT_CLASS,
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
 * The white indicator slides between items (220 ms). Each sub-screen mounts its own copy of this
 * control, so a Motion layout animation has nothing to start from when the page changes: the
 * indicator is also its own view-transition group (`segment-ind`), which slides it from the old
 * item to the new one with the page transition (motion.md 1.1). The Motion `layoutId` (stable per
 * group, from the label) animates when the same copy stays mounted, as in the gallery.
 */
export function SegmentedNav({ items, activeKey, label, className }: SegmentedNavProps) {
  // Stable per group, not per instance: each sub-screen mounts its own SegmentedNav, and the
  // indicator only slides between two screens if both instances share the same layoutId.
  const itemClass = items.length > 2 ? SEGMENTED_ITEM_COMPACT_CLASS : SEGMENTED_ITEM_CLASS;
  const indicatorId = `segmented-nav-${label}`;

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
                itemClass,
                active ? SEGMENTED_ITEM_ACTIVE_CLASS : SEGMENTED_ITEM_INACTIVE_CLASS,
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 [view-transition-name:segment-ind]"
                >
                  <SegmentedIndicator layoutId={indicatorId} />
                </span>
              ) : null}
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </MotionConfig>
  );
}
