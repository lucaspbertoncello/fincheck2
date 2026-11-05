import { ICON_MARKUP, type IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { IconSize } from '#/components/icons/icon.type.ts';

const SIZE_CLASS = {
  xs: 'size-3.5',
  sm: 'size-icon-sm',
  md: 'size-4.5',
  base: 'size-icon',
  lg: 'size-icon-lg',
} as const satisfies Record<IconSize, unknown>;

type IconProps = {
  name: IconName;
  /** 14 (xs), 16 (sm), 18 (md, buttons and tabs), 20 (base, default) or 24 (lg, row menu). */
  size?: IconSize;
  className?: string;
};

/** Decorative Solar Bold Duotone icon in the current text color; the caller names the control. */
export function Icon({ name, size = 'base', className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cx('shrink-0', SIZE_CLASS[size], className)}
      dangerouslySetInnerHTML={{ __html: ICON_MARKUP[name] }}
    />
  );
}
