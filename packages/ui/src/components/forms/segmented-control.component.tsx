import { MotionConfig } from 'motion/react';
import { useId } from 'react';
import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { SegmentedIndicator } from '#/components/forms/segmented-indicator.component.tsx';
import { SegmentedSlide } from '#/components/forms/segmented-slide.component.tsx';
import type { SegmentedTone } from '#/components/forms/segmented-indicator.type.ts';
import {
  SEGMENTED_ITEM_ACTIVE_CLASS,
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_ITEM_FIT_CLASS,
  SEGMENTED_ITEM_INACTIVE_CLASS,
  SEGMENTED_TRACK_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { SegmentedOption } from '#/components/forms/segmented-control.type.ts';

const DOT_TONE_CLASS: Record<SegmentedTone, string> = {
  neutral: 'text-fg-secondary',
  loss: 'text-loss',
  gain: 'text-gain',
};

/** Fixed icon colors: they stay the same whether the option is selected or not. */
const ICON_TONE_CLASS: Record<SegmentedTone, string> = {
  neutral: 'text-fg-secondary',
  loss: 'text-loss',
  gain: 'text-gain',
};

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  /** Accessible name of the group ("Tipo de transação"). */
  label: string;
  isDisabled?: boolean;
  /**
   * The main-control version (Todas | Despesas | Receitas): fills the width at every size, equal
   * segments, a tilted card-dot before each label (unless the option has an icon) and the tone of
   * each option on the slide. One pill (`SegmentedSlide`) moves from option to option and takes
   * the new tone on the way. The same control as Despesa | Receita in the amount field.
   */
  direction?: boolean;
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
  direction,
  className,
}: SegmentedControlProps) {
  const indicatorId = useId();
  const selectedIndex = options.findIndex((option) => option.key === value);

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
          'data-[disabled]:opacity-50',
          direction ? 'relative w-full' : 'lg:inline-flex',
          className,
        )}
      >
        {direction && selectedIndex >= 0 ? (
          <SegmentedSlide
            index={selectedIndex}
            count={options.length}
            tone={options[selectedIndex]?.tone}
          />
        ) : null}
        {options.map((option) => (
          <ToggleButton
            key={option.key}
            id={option.key}
            className={({ isSelected }) =>
              cx(
                direction ? SEGMENTED_ITEM_CLASS : SEGMENTED_ITEM_FIT_CLASS,
                isSelected ? SEGMENTED_ITEM_ACTIVE_CLASS : SEGMENTED_ITEM_INACTIVE_CLASS,
              )
            }
          >
            {({ isSelected }) => (
              <>
                {isSelected && !direction ? <SegmentedIndicator layoutId={indicatorId} /> : null}
                {direction && !option.icon ? (
                  <span
                    aria-hidden="true"
                    className={cx(
                      'relative inline-block h-1.75 w-2.5 shrink-0 -rotate-8 rounded-(--radius-pingo) bg-current transition-colors duration-(--duration-fast)',
                      isSelected ? DOT_TONE_CLASS[option.tone ?? 'neutral'] : 'text-fg-tertiary',
                    )}
                  />
                ) : null}
                {option.icon ? (
                  <Icon
                    name={option.icon}
                    size="md"
                    className={cx('relative', option.iconTone && ICON_TONE_CLASS[option.iconTone])}
                  />
                ) : null}
                <span className="relative truncate" title={option.label}>
                  {option.label}
                </span>
              </>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </MotionConfig>
  );
}
