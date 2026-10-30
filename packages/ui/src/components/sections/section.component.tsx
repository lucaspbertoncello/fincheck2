import { type ReactNode, useId } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type SectionProps = {
  /** Section title (Fustat 17). */
  title: string;
  /** Right side of the header: a link ("A pagar e receber"), arrows or a button. */
  action?: ReactNode;
  /** "open" is loose on the gradient with a 1 px rule on top; "glass" is the boxed card. */
  variant?: 'open' | 'glass';
  /** False drops the rule on top of an open section (the first one of a column). */
  divider?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Generic card of a screen section (components.md 3.6): no box by default, only a 1 px rule on
 * top and 24 of space. The glass box is for full-screen states and action panels.
 */
export function Section({
  title,
  action,
  variant = 'open',
  divider = true,
  children,
  className,
}: SectionProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cx(
        'flex flex-col gap-s16',
        variant === 'glass' ? 'glass p-s24' : cx('pt-s24', divider && 'border-t border-line'),
        className,
      )}
    >
      <header className="flex min-h-ctl-sm items-center justify-between gap-s16">
        <h2
          id={titleId}
          className="min-w-0 font-title text-section leading-(--line-height-title) font-heading text-fg-primary"
        >
          {title}
        </h2>
        {action ? <div className="flex shrink-0 items-center gap-s8">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
