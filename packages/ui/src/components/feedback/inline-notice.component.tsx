import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type InlineNoticeProps = {
  /** "Maxxy atrasado 2 dias" */
  children: string;
  /** Underlined link text after the dot ("ver"). */
  linkLabel?: string;
  onPress?: () => void;
  href?: string;
  className?: string;
};

/**
 * Short exception line under the date (components.md 13.5): 16 px warn icon, 14 px text and an
 * underlined link in the warn color. Only for something unusual that no block shows.
 */
export function InlineNotice({ children, linkLabel, onPress, href, className }: InlineNoticeProps) {
  return (
    <p
      className={cx('flex flex-wrap items-center gap-x-s8 text-label text-fg-secondary', className)}
    >
      <Icon name="warning" size="sm" className="text-caution" />
      <span className="whitespace-nowrap">{children}</span>
      {linkLabel ? (
        <>
          <span aria-hidden="true">·</span>
          <Link
            href={href}
            onPress={onPress}
            className="focus-ring cursor-pointer rounded-tiny font-emphasis text-caution underline underline-offset-2 data-[hovered]:no-underline"
          >
            {linkLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}
