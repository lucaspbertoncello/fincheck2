import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type MonthSummaryCardProps = {
  icon: IconName;
  label: string;
  /** Badge at the right of the header (percent, variation or delta). */
  badge?: ReactNode;
  /** The big value: a `Money`. */
  value: ReactNode;
  /** Line under the value; up to 2 lines. */
  subtext: ReactNode;
  /** The `SummaryBar`. */
  bar: ReactNode;
  /** Legend under the bar ("Recebido do esperado"). */
  barLegend: string;
  /** Makes the whole card a link to where the number comes from (already filtered by the month). */
  href?: string;
  className?: string;
};

/** The card is one link: the label carries it and stretches over the box. Focus rings the card. */
const LINKED_CLASS =
  'cursor-pointer hover:bg-subtle has-[[data-focus-visible]]:outline-2 has-[[data-focus-visible]]:outline-offset-2 has-[[data-focus-visible]]:outline-(--color-focus-ring) motion-reduce:transition-none';

/**
 * Frame of the three month summary cards (components.md 3.2): round icon and label, badge, value,
 * subtext and bar with legend. The bar block is pushed to the bottom, so the three cards of the
 * grid keep the same height whatever the subtext does.
 */
export function MonthSummaryCard({
  icon,
  label,
  badge,
  value,
  subtext,
  bar,
  barLegend,
  href,
  className,
}: MonthSummaryCardProps) {
  return (
    <article
      aria-label={label}
      className={cx(
        'relative flex h-full w-full flex-col gap-s8 rounded-panel p-s16 transition-colors duration-(--duration-fast)',
        'max-lg:border max-lg:border-line max-lg:bg-glass',
        href && LINKED_CLASS,
        className,
      )}
    >
      <header className="flex items-center gap-s8">
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary"
        >
          <Icon name={icon} size="sm" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-label font-emphasis text-fg-primary">
          {href ? (
            <Link
              href={href}
              className="cursor-pointer text-fg-primary no-underline outline-none after:absolute after:inset-0 after:rounded-panel after:content-['']"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </h3>
        {badge}
      </header>
      <p className="text-money-lg leading-(--line-height-money) text-fg-primary lg:text-money-card">
        {value}
      </p>
      <p className="line-clamp-2 flex-1 text-meta text-fg-secondary">{subtext}</p>
      <div className="flex flex-col gap-s8 pt-s4">
        {bar}
        <p className="text-caption text-fg-secondary">{barLegend}</p>
      </div>
    </article>
  );
}
