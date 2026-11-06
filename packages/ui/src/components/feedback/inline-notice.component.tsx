import { Button } from '#/components/buttons/button.component.tsx';
import { LinkButton } from '#/components/buttons/link-button.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type InlineNoticeProps = {
  /** "Maxxy atrasado 2 dias" */
  children: string;
  /** Label of the small button after the dot ("ver"): a link with `href`, a press with `onPress`. */
  linkLabel?: string;
  onPress?: () => void;
  href?: string;
  className?: string;
};

/**
 * Short exception line under the date (components.md 13.5): 16 px warn icon, 14 px text and a
 * small system button. Only for something unusual that no block shows.
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
          {href ? (
            <LinkButton href={href} size="sm">
              {linkLabel}
            </LinkButton>
          ) : (
            <Button variant="tertiary" size="sm" onPress={onPress}>
              {linkLabel}
            </Button>
          )}
        </>
      ) : null}
    </p>
  );
}
