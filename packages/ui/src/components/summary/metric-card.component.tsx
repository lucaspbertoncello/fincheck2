import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { Skeleton } from '#/components/states/skeleton.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type MetricCardProps = {
  icon: IconName;
  label: string;
  /** Badge at the right of the header (percent, variation or delta). */
  badge?: ReactNode;
  /** Keeps the badge row (at the badge's height) when there is no badge, so boxes on one row stay aligned. */
  reserveBadge?: boolean;
  /** The big value: a `Money` or any short node. Null draws `emptyText` (no data yet). */
  value: ReactNode | null;
  /** Text of the value row when `value` is null. */
  emptyText?: string;
  /** Supporting lines under the value; the caller decides how each line wraps or truncates. */
  lines?: ReactNode;
  /** Drawn at the bottom of the box (a bar and its legend). */
  footer?: ReactNode;
  /** Loading draws the same box with blocks where the value and the lines go. */
  isLoading?: boolean;
  /** Makes the whole card a link to where the number comes from. */
  href?: string;
  className?: string;
};

// Icon beside the label from 11rem of content (every desktop box, 1280 included); only a narrow
// phone box puts the icon over the label, so the label never wraps.
const HEADER_CLASS =
  'flex flex-col items-start gap-s8 @min-[11rem]/card:flex-row @min-[11rem]/card:items-center';
const VALUE_CLASS =
  'flex h-8 items-center text-money-sm leading-(--line-height-money) text-fg-primary @min-[14rem]/card:text-money-md';
/** The card is one link: the label carries it and stretches over the box. Focus rings the card. */
const LINKED_CLASS =
  'cursor-pointer has-[[data-focus-visible]]:outline-2 has-[[data-focus-visible]]:outline-offset-2 has-[[data-focus-visible]]:outline-(--color-focus-ring)';

/**
 * The box of a metric, one for every screen that shows a number with context (Visão geral and the
 * curiosities of Perfil): rounded panel with a 1 px line and glass, the small icon in its round
 * mark beside the label, ONE number in the light money weight with tabular digits, and the
 * supporting lines. The value row has a fixed height and the lines area takes the rest, so boxes
 * on the same row keep the same height whether they have data or not. The label never wraps: in a
 * narrow box the icon goes over it instead.
 */
export function MetricCard({
  icon,
  label,
  badge,
  reserveBadge = false,
  value,
  emptyText = 'Ainda sem dado',
  lines,
  footer,
  isLoading = false,
  href,
  className,
}: MetricCardProps) {
  return (
    <article
      aria-label={label}
      className={cx(
        '@container/card relative flex h-full w-full min-w-0 flex-col gap-s8 rounded-panel border border-line bg-glass p-s12 lg:p-s16',
        href && LINKED_CLASS,
        className,
      )}
    >
      <header className={HEADER_CLASS}>
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary"
        >
          <Icon name={icon} size="sm" />
        </span>
        <h3 className="min-w-0 text-meta font-emphasis whitespace-nowrap text-fg-secondary">
          {href ? (
            <Link
              href={href}
              className="cursor-pointer text-fg-secondary no-underline outline-none after:absolute after:inset-0 after:rounded-panel after:content-['']"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </h3>
      </header>
      {/* Its own row: beside a long label ("Resultado do mês") the badge would not fit. */}
      {badge ? (
        <span className="flex">{badge}</span>
      ) : reserveBadge ? (
        <span aria-hidden="true" className="invisible flex px-s8 py-s4 text-meta">
          &nbsp;
        </span>
      ) : null}
      {isLoading ? (
        <>
          <div className="flex h-8 items-center">
            <Skeleton className="h-6 w-2/3" />
          </div>
          <div className="flex h-10 flex-col justify-center gap-s8">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </>
      ) : value === null ? (
        <>
          <p className="flex h-8 items-center text-label whitespace-nowrap text-fg-secondary">
            {emptyText}
          </p>
          <div aria-hidden="true" className="h-10" />
        </>
      ) : (
        <>
          <p className={VALUE_CLASS}>{value}</p>
          <div className="flex h-10 min-w-0 flex-col justify-center text-meta leading-5 text-fg-secondary">
            {lines}
          </div>
        </>
      )}
      {footer ? <div className="mt-auto flex flex-col gap-s8 pt-s4">{footer}</div> : null}
    </article>
  );
}
