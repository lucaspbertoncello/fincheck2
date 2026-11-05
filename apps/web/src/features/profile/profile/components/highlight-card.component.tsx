import { Icon, Skeleton } from '@fincheck/ui';

import type { HighlightItem } from '#/features/profile/profile/types/highlight-item.type.ts';

type HighlightCardProps = {
  item: HighlightItem;
  /** Loading draws the same box with blocks where the label, the number and the line go. */
  isLoading?: boolean;
};

const HEADER_CLASS =
  'flex flex-col items-start gap-s8 @min-[14rem]/card:flex-row @min-[14rem]/card:items-center';
const VALUE_CLASS =
  'flex h-8 items-center text-money-sm leading-(--line-height-money) text-fg-primary @min-[14rem]/card:text-money-md';

/**
 * One curiosity (BR-PRF-005), in the card of the system (rounded panel, 1 px line, glass): icon in
 * the round mark and the label, ONE number in the light money weight with tabular digits, and one
 * line of context. The number row and the context row have a fixed height, so a card with no data
 * ("Ainda sem dado") is as tall as one with data and the grid never moves. Nothing wraps: the label
 * is short, and the context takes two lines, the lead (a name, a category, a weekday) on the first
 * and the tail (the date, the share) on the second, so a 2-column phone grid keeps both whole; only
 * a long name gives way with an ellipsis and its full text in the title.
 */
export function HighlightCard({ item, isLoading = false }: HighlightCardProps) {
  const { icon, label, value, context } = item;

  return (
    <article
      aria-label={label}
      className="@container/card flex h-full w-full min-w-0 flex-col gap-s8 rounded-panel border border-line bg-glass p-s12 lg:p-s16"
    >
      <header className={HEADER_CLASS}>
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary"
        >
          <Icon name={icon} size="sm" />
        </span>
        <h3 className="min-w-0 text-meta font-emphasis whitespace-nowrap text-fg-secondary">
          {label}
        </h3>
      </header>
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
            Ainda sem dado
          </p>
          <div aria-hidden="true" className="h-10" />
        </>
      ) : (
        <>
          <p className={VALUE_CLASS}>{value}</p>
          <p className="flex h-10 min-w-0 flex-col justify-center text-meta leading-5 whitespace-nowrap text-fg-secondary">
            {context?.lead ? (
              <span className="min-w-0 truncate" title={context.lead}>
                {context.lead}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{context?.tail}</span>
          </p>
        </>
      )}
    </article>
  );
}
