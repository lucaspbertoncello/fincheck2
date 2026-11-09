import type { ReactNode } from 'react';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { ChipTone } from '#/components/chips/chip.type.ts';

const TONE_CLASS = {
  neutral: 'bg-subtle text-fg-secondary',
  warn: 'bg-caution-weak text-caution',
  accent: 'bg-brand-weak text-brand',
  ok: 'bg-gain-weak text-gain',
  /** Suggestion: no fill, dashed border. */
  dashed: 'border border-dashed border-fg-tertiary text-fg-secondary',
  /** "# delivery": no fill, 1 px border. */
  tag: 'border border-line text-fg-secondary',
} as const satisfies Record<ChipTone, unknown>;

type ChipProps = {
  children: ReactNode;
  tone?: ChipTone;
  /** Large chip: padding 8 × 12 and 14 px text. */
  large?: boolean;
  /**
   * A chip that sits in a line of text: 20 px tall, border included, so it never makes the line
   * taller (the detail line of a list row).
   */
  compact?: boolean;
  /** Leading 14 px icon. */
  icon?: IconName;
  /** Hover text, for a chip that stands for more than it writes ("+2"). */
  title?: string;
  /** Spoken name, for the same chip: the chip is then an image of that name to a screen reader. */
  ariaLabel?: string;
  className?: string;
};

/** Status or label pill (components.md 5.2): "Editada", "Atrasado", "# delivery". Not interactive. */
export function Chip({
  children,
  tone = 'neutral',
  large = false,
  compact = false,
  icon,
  title,
  ariaLabel,
  className,
}: ChipProps) {
  return (
    <span
      title={title}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      className={cx(
        'inline-flex items-center gap-s4 rounded-capsule font-plain whitespace-nowrap',
        compact
          ? 'h-5 px-s8 text-meta'
          : large
            ? 'px-s12 py-s8 text-label'
            : 'px-s8 py-s4 text-meta',
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size="xs" /> : null}
      {children}
    </span>
  );
}
