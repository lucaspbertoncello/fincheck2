import type { ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type FormModalSplitProps = {
  /** Left column on the desktop: the protagonist (the amount and its direction). */
  aside: ReactNode;
  /** The groups of fields. */
  children: ReactNode;
  className?: string;
};

/**
 * Two equal columns for a form with a hero: the aside (the amount) and the fields, a hairline
 * between them. Under 576 px of content (the phone) it stacks, aside first. Each column is its own
 * container, so a `columns={2}` group inside it measures the column, not the modal. Use it when one
 * field is the point of the form; for plain pairs of fields use `columns={2}` on the group.
 */
export function FormModalSplit({ aside, children, className }: FormModalSplitProps) {
  return (
    <div
      className={cx(
        'grid grid-cols-1 gap-s16 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @xl:gap-x-s24',
        className,
      )}
    >
      <div className="@container flex min-w-0 flex-col gap-s16 lg:gap-s24 @xl:border-r @xl:border-line @xl:pr-s24">
        {aside}
      </div>
      <div className="@container flex min-w-0 flex-col gap-s16 lg:gap-s24">{children}</div>
    </div>
  );
}
