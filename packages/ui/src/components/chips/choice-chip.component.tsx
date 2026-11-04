import type { ReactNode } from 'react';
import { ToggleButton } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type ChoiceChipProps = {
  children: ReactNode;
  selected: boolean;
  onChange: (selected: boolean) => void;
  /** Dashed border: "Escolher outra" and other open-ended options. */
  ghost?: boolean;
  icon?: IconName;
  isDisabled?: boolean;
  className?: string;
};

/** Filter or choice chip (components.md 5.2): 40 px pill with border; selected is green. */
export function ChoiceChip({
  children,
  selected,
  onChange,
  ghost = false,
  icon,
  isDisabled,
  className,
}: ChoiceChipProps) {
  return (
    <ToggleButton
      isSelected={selected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cx(
        'focus-ring inline-flex h-ctl-tab max-w-full min-w-0 cursor-pointer items-center gap-s8 rounded-capsule border px-s16 text-label whitespace-nowrap',
        'transition-transform duration-(--duration-fast) ease-(--ease-standard) data-[pressed]:scale-96',
        'data-[disabled]:cursor-default data-[disabled]:opacity-50',
        ghost ? 'border-dashed border-fg-tertiary' : 'border-line',
        selected
          ? 'border-brand bg-brand-weak font-emphasis text-brand'
          : 'text-fg-primary data-[hovered]:bg-subtle',
        className,
      )}
    >
      {icon ? <Icon name={icon} size="sm" /> : null}
      <span className="truncate">{children}</span>
    </ToggleButton>
  );
}
