import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

const SIZE_CLASS = {
  /** 40 px on the desktop, 36 px on the phone (list rows). */
  row: 'size-9 lg:size-10',
  /** 48 px (review queue header). */
  lg: 'size-12',
} as const;

const TYPE_PATH = {
  income: 'M7 17L17 7m0 0H9m8 0v8',
  expense: 'm7 7l10 10m0 0V9m0 8H9',
  transfer: 'M4 9h15m0 0l-4-4m4 4l-4 4M20 15H5m0 0l4-4m-4 4l4 4',
} as const;

const TYPE_TONE_CLASS = {
  income: 'text-gain',
  expense: 'text-loss',
  transfer: 'text-fg-secondary',
} as const;

export type CategoryIconType = keyof typeof TYPE_PATH;
export type CategoryIconSize = keyof typeof SIZE_CLASS;

type CategoryIconProps = {
  icon: IconName;
  size?: CategoryIconSize;
  /** Adds the type badge at the bottom right: solid arrow, green (income), red (expense) or gray. */
  type?: CategoryIconType;
  /** Dashed border: archived category or "Sem categoria". */
  dashed?: boolean;
  className?: string;
};

/**
 * Category icon of a row: a circle with the duotone icon in the secondary text color over the
 * subtle surface (ui adjustment 10). Decorative: the row text names the category.
 */
export function CategoryIcon({
  icon,
  size = 'row',
  type,
  dashed = false,
  className,
}: CategoryIconProps) {
  return (
    <span className={cx('relative inline-grid shrink-0', SIZE_CLASS[size], className)}>
      <span
        aria-hidden="true"
        className={cx(
          'grid size-full place-items-center rounded-capsule bg-subtle text-fg-secondary',
          dashed && 'border border-dashed border-fg-tertiary',
        )}
      >
        <Icon name={icon} size={size === 'lg' ? 'lg' : 'base'} />
      </span>
      {type ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          data-type={type}
          className={cx('absolute -right-s4 -bottom-s4 size-4.5', TYPE_TONE_CLASS[type])}
          fill="none"
        >
          <path
            d={TYPE_PATH[type]}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}
