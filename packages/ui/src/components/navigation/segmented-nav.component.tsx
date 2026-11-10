import { MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { SegmentedIndicator } from '#/components/forms/segmented-indicator.component.tsx';
import {
  SEGMENTED_ITEM_ACTIVE_CLASS,
  SEGMENTED_ITEM_COMPACT_CLASS,
  SEGMENTED_ITEM_DENSE_CLASS,
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_ITEM_INACTIVE_CLASS,
  SEGMENTED_TRACK_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { SegmentedNavItem } from '#/components/navigation/segmented-nav.type.ts';

type SegmentedNavProps = {
  items: SegmentedNavItem[];
  activeKey: string;
  label: string;
  /**
   * Four or more links that have to fit on the phone: no icons, 12 px labels and 4 px of side
   * padding there. The track scrolls sideways only as a last resort, opening on the active item.
   * Absent, the control is as it always was.
   */
  dense?: boolean;
  className?: string;
};

/**
 * Segmented control made of links (Recorrências | A pagar e receber | Assinaturas | Amigos, Categorias | Regras), each
 * with its icon in the label color, like the Transações controls.
 * The white indicator slides between items (220 ms). Each sub-screen mounts its own copy of this
 * control, so a Motion layout animation has nothing to start from when the page changes: the
 * indicator is also its own view-transition group (`segment-ind`), which slides it from the old
 * item to the new one with the page transition (motion.md 1.1). The Motion `layoutId` (stable per
 * group, from the label) animates when the same copy stays mounted, as in the gallery.
 */
export function SegmentedNav({
  items,
  activeKey,
  label,
  dense = false,
  className,
}: SegmentedNavProps) {
  // Stable per group, not per instance: each sub-screen mounts its own SegmentedNav, and the
  // indicator only slides between two screens if both instances share the same layoutId.
  const scrolls = dense;
  const itemClass = dense
    ? SEGMENTED_ITEM_DENSE_CLASS
    : items.length > 2
      ? SEGMENTED_ITEM_COMPACT_CLASS
      : SEGMENTED_ITEM_CLASS;
  const indicatorId = `segmented-nav-${label}`;
  const trackRef = useRef<HTMLElement>(null);
  const [hasMore, setHasMore] = useState(false);

  // The scrolling track (phone only) opens on the active item and fades its right edge while
  // there is more to scroll to, so the last tab does not hide without a hint.
  useEffect(() => {
    const track = trackRef.current;
    if (!scrolls || !track) return;
    const update = () => setHasMore(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    const active = track.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      track.scrollLeft = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
    }
    update();
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      track.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [scrolls, activeKey]);

  return (
    <MotionConfig reducedMotion="user">
      <nav
        ref={trackRef}
        aria-label={label}
        data-more={hasMore ? '' : undefined}
        className={cx(
          SEGMENTED_TRACK_CLASS,
          'lg:inline-flex',
          scrolls &&
            'max-lg:overflow-x-auto max-lg:overscroll-x-contain max-lg:scrollbar-none max-lg:data-[more]:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]',
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
              {item.icon ? (
                <Icon
                  name={item.icon}
                  size="md"
                  className={dense ? 'relative max-lg:hidden' : 'relative'}
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
