import { type ReactNode, useId } from 'react';

import { Chip } from '#/components/chips/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type NeedsAttentionStripProps = {
  /** "Precisa de você". */
  title?: string;
  /** Count chip text: "2 recorrências". */
  countLabel: string;
  /** The `RecurrenceRow`s that need a decision. */
  children: ReactNode;
  className?: string;
};

/**
 * "Precisa de você" strip (components.md 10.1): a soft warm box (the warn-weak token at 45% over the
 * page, a faint warn border) with an alert icon, a count chip and the rows that ask for a decision,
 * each a standard list row, split by a faint warn rule. The screen renders it only when there is
 * something to decide.
 */
export function NeedsAttentionStrip({
  title = 'Precisa de você',
  countLabel,
  children,
  className,
}: NeedsAttentionStripProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cx(
        'rounded-panel border border-caution/20 bg-caution-weak/45 px-s16 pt-s16 pb-s8 lg:px-s24',
        className,
      )}
    >
      <header className="flex min-h-ctl-sm items-center justify-between gap-s16">
        <h2
          id={titleId}
          className="flex items-center gap-s8 font-title text-section leading-(--line-height-title) font-heading text-fg-primary"
        >
          <Icon name="warning" size="md" className="text-caution" />
          {title}
        </h2>
        <Chip className="bg-glass">{countLabel}</Chip>
      </header>
      <ul className="flex flex-col divide-y divide-caution/22">{children}</ul>
    </section>
  );
}
