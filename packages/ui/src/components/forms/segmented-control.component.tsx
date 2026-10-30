import { MotionConfig } from 'motion/react';
import { useId } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { SegmentedIndicator } from '#/components/forms/segmented-indicator.component.tsx';
import {
  SEGMENTED_ITEM_ACTIVE_CLASS,
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_ITEM_INACTIVE_CLASS,
  SEGMENTED_TRACK_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

export type SegmentedOption = {
  key: string;
  label: string;
  /** 18 px icon before the label ("Lista | Por categoria"). */
  icon?: IconName;
};

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  /** Accessible name of the group ("Tipo de transação"). */
  label: string;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Segmented control for choosing a value (Todas | Despesas | Receitas), components.md 5.3.
 * Not navigation: for links use SegmentedNav. Always one option selected; arrows move between
 * options. Fills the width on the phone, hugs the content on the desktop.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  isDisabled,
  className,
}: SegmentedControlProps) {
  const indicatorId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next !== undefined) onChange(String(next));
        }}
        isDisabled={isDisabled}
        className={cx(
          SEGMENTED_TRACK_CLASS,
          'data-[disabled]:opacity-50 lg:inline-flex',
          className,
        )}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.key}
            id={option.key}
            className={({ isSelected }) =>
              cx(
                SEGMENTED_ITEM_CLASS,
                isSelected ? SEGMENTED_ITEM_ACTIVE_CLASS : SEGMENTED_ITEM_INACTIVE_CLASS,
              )
            }
          >
            {({ isSelected }) => (
              <>
                {isSelected ? <SegmentedIndicator layoutId={indicatorId} /> : null}
                {option.icon ? <Icon name={option.icon} size="md" className="relative" /> : null}
                <span className="relative">{option.label}</span>
              </>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </MotionConfig>
  );
}
