import { useId, type ReactNode } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type FormModalGroupProps = {
  /** Quiet name of the group ("Quando e onde"). Without it the group is just a block of fields. */
  label?: string;
  /** Two columns when the modal is wide enough (a container query: 576 px of content or more). */
  columns?: 1 | 2;
  children: ReactNode;
  className?: string;
};

/**
 * A block of related fields in a form modal: a 12 px label in the tertiary tone, a hairline that
 * runs to the edge (the line between groups), then the fields at 16 of gap. Inside `FormModal` the
 * groups are 24 apart. Two columns only when the fields pair up (date and account, not description).
 */
export function FormModalGroup({ label, columns = 1, children, className }: FormModalGroupProps) {
  const labelId = useId();

  return (
    <section
      aria-labelledby={label ? labelId : undefined}
      className={cx('flex min-w-0 flex-col gap-s8 lg:gap-s12', className)}
    >
      {label ? (
        <div className="flex items-center gap-s12">
          <h3 id={labelId} className="text-meta leading-none font-emphasis text-fg-tertiary">
            {label}
          </h3>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>
      ) : null}
      <div
        className={cx(
          'gap-s12 lg:gap-s16',
          columns === 2 ? 'grid grid-cols-1 @xl:grid-cols-2' : 'flex flex-col',
        )}
      >
        {children}
      </div>
    </section>
  );
}
