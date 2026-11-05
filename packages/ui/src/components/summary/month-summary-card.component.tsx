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

/**
 * The card is one link: the label carries it and stretches over the box. Focus rings the card.
 * No hover effect: the box already has its background at rest (polish 11, Lucas).
 */
const LINKED_CLASS =
  'cursor-pointer has-[[data-focus-visible]]:outline-2 has-[[data-focus-visible]]:outline-offset-2 has-[[data-focus-visible]]:outline-(--color-focus-ring)';

/**
 * Frame of the three month summary cards (components.md 3.2): round icon and label, badge, value,
 * subtext and bar with legend. The label never truncates: below 272 px of card the icon gives its
 * room back, and if the badge still does not fit it drops under the label. The bar block is pushed to the bottom, so the three cards of the
 * grid keep the same height whatever the subtext does. The box has the surface background at rest,
 * on every width (no border, no hover).
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
        '@container/card relative flex h-full w-full flex-col gap-s8 rounded-panel bg-subtle p-s16 lg:p-s24',
        href && LINKED_CLASS,
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-s8 gap-y-s4">
        <span
          aria-hidden="true"
          className="hidden size-6 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary @min-[17rem]/card:grid"
        >
          <Icon name={icon} size="sm" />
        </span>
        <h3 className="min-w-0 flex-auto text-label whitespace-nowrap font-emphasis text-fg-primary">
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
        {badge ? <span className="ml-auto flex shrink-0">{badge}</span> : null}
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
