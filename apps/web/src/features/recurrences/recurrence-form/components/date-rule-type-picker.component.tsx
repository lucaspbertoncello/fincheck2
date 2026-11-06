import { MotionConfig, motion } from 'motion/react';
import { useId } from 'react';
import { Radio, RadioGroup } from 'react-aria-components';

import { DATE_RULE_TYPE_OPTIONS } from '#/features/recurrences/recurrence-form/constants/date-rule-types.constant.ts';
import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';

type DateRuleTypePickerProps = {
  value: RecurrenceFormValues['ruleType'];
  onChange: (ruleType: RecurrenceFormValues['ruleType']) => void;
};

/**
 * The 4 ways a date falls, as one segmented track (the same look as Despesa | Receita). Only the
 * name of the rule: the sentence under it says the rest. Radio group, so the arrows move the
 * choice. On the phone the track is a 2 by 2 grid of the same segments; nothing wraps.
 */
export function DateRuleTypePicker({ value, onChange }: DateRuleTypePickerProps) {
  const indicatorId = useId();

  return (
    <MotionConfig reducedMotion="user">
      <RadioGroup
        aria-label="Tipo de regra"
        value={value}
        onChange={(key) => onChange(key as RecurrenceFormValues['ruleType'])}
      >
        <div className="grid grid-cols-2 gap-s4 rounded-panel border border-line bg-subtle p-s4 @xl:flex @xl:rounded-capsule">
          {DATE_RULE_TYPE_OPTIONS.map((option) => (
            <Radio
              key={option.key}
              value={option.key}
              className={({ isSelected }) =>
                `focus-ring relative flex min-h-ctl-touch flex-1 cursor-pointer items-center justify-center rounded-capsule px-s8 text-label font-emphasis whitespace-nowrap transition-colors duration-(--duration-fast) @xl:min-h-8 ${
                  isSelected ? 'text-fg-primary' : 'text-fg-tertiary data-[hovered]:text-fg-primary'
                }`
              }
            >
              {({ isSelected }) => (
                <>
                  {isSelected ? (
                    <motion.span
                      layoutId={indicatorId}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-capsule bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)"
                      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  ) : null}
                  <span className="relative">{option.label}</span>
                </>
              )}
            </Radio>
          ))}
        </div>
      </RadioGroup>
    </MotionConfig>
  );
}
