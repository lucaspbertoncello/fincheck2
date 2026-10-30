import { Radio, RadioGroup } from 'react-aria-components';

import { Chip } from '#/components/chips/index.ts';
import { Icon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

export type DateRuleOption = {
  key: string;
  /** "Dia fixo", "Dia útil", "Por volta do dia", "Qualquer dia". */
  label: string;
  /** Under the label: "Todo dia 20". */
  hint?: string;
  icon?: IconName;
};

type DateRulePickerProps = {
  options: readonly DateRuleOption[];
  value: string;
  onChange: (key: string) => void;
  /** Accessible name of the group ("Regra de data"). */
  label: string;
  /** The next dates of the chosen rule, already written ("seg, 20/11"). Computed by the caller. */
  preview?: readonly string[];
  /** Heading of the preview. */
  previewLabel?: string;
  className?: string;
};

/**
 * The 4 date-rule cards of "Nova recorrência" (components.md 15): 2-column grid of 64 px cards,
 * radius 12; the chosen one gets a 2 px accent border and the weak accent fill, then the preview
 * of the next dates. React Aria radio group: arrows move the choice.
 */
export function DateRulePicker({
  options,
  value,
  onChange,
  label,
  preview,
  previewLabel = 'Próximas datas',
  className,
}: DateRulePickerProps) {
  return (
    <div className={cx('flex flex-col gap-s16', className)}>
      <RadioGroup value={value} onChange={onChange} aria-label={label}>
        <div className="grid grid-cols-2 gap-s12">
          {options.map((option) => (
            <Radio
              key={option.key}
              value={option.key}
              className={cx(
                'focus-ring flex min-h-16 cursor-pointer items-center gap-s12 rounded-input border border-line px-s16 py-s8 text-fg-primary',
                'transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle',
                'data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:ring-1 data-[selected]:ring-brand data-[selected]:ring-inset',
              )}
            >
              {option.icon ? (
                <Icon name={option.icon} size="base" className="text-fg-secondary" />
              ) : null}
              <span className="min-w-0">
                <span className="block text-label font-emphasis">{option.label}</span>
                {option.hint ? (
                  <span className="block text-meta text-fg-secondary">{option.hint}</span>
                ) : null}
              </span>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      {preview?.length ? (
        <div className="flex flex-col gap-s8">
          <p className="text-label text-fg-secondary">{previewLabel}</p>
          <ul className="flex flex-wrap gap-s8">
            {preview.map((date) => (
              <li key={date}>
                <Chip large className="tabular-nums">
                  {date}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
