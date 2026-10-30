import type { ReactNode } from 'react';
import { Button } from 'react-aria-components';

import { Icon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

const KIND_CLASS = {
  /** The operator ("a descrição contém"): subtle fill with border. */
  option: 'border border-line bg-subtle text-fg-primary',
  /** The typed value ("UBER *TRIP"): glass fill, stronger border, tabular. */
  value: 'border border-fg-tertiary bg-glass text-fg-primary tabular-nums',
  /** The category: weak accent fill. */
  category: 'bg-brand-weak font-emphasis text-brand',
  /** An empty slot ("+ tag"): dashed. */
  empty: 'border border-dashed border-fg-tertiary text-fg-secondary',
} as const;

const TRAILING_ICON: Record<'dropdown' | 'edit', IconName> = {
  dropdown: 'chevron-down',
  edit: 'edit',
};

export type RuleTokenKind = keyof typeof KIND_CLASS;

type RuleTokenProps = {
  kind?: RuleTokenKind;
  children: ReactNode;
  /** Leading 14 px icon (the category icon, the "+" of an empty slot). */
  icon?: IconName;
  trailing?: keyof typeof TRAILING_ICON;
  /** Opens the picker of this blank. Without it the token is plain text in a pill. */
  onPress?: () => void;
  /** Accessible name when the visible text is not enough ("Condição: a descrição contém"). */
  ariaLabel?: string;
  isDisabled?: boolean;
  className?: string;
};

const BASE_CLASS =
  'inline-flex h-ctl-touch items-center gap-s8 rounded-capsule px-s12 text-list whitespace-nowrap lg:h-ctl-tab';

/**
 * A blank of the rule sentence (components.md 9.1): pill of 40 (44 on the phone), 15 px text. Each
 * kind has its look: option, value, category, empty. A button when `onPress` is given.
 */
export function RuleToken({
  kind = 'option',
  children,
  icon,
  trailing,
  onPress,
  ariaLabel,
  isDisabled,
  className,
}: RuleTokenProps) {
  const content = (
    <>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
      {trailing ? <Icon name={TRAILING_ICON[trailing]} size="sm" /> : null}
    </>
  );

  if (!onPress) {
    return <span className={cx(BASE_CLASS, KIND_CLASS[kind], className)}>{content}</span>;
  }

  return (
    <Button
      onPress={onPress}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      className={cx(
        BASE_CLASS,
        KIND_CLASS[kind],
        'focus-ring cursor-pointer transition-transform duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96 data-[disabled]:cursor-default data-[disabled]:opacity-50',
        className,
      )}
    >
      {content}
    </Button>
  );
}
