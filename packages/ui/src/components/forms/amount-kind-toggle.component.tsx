import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';

import type { AmountKind } from '#/components/forms/amount-kind.type.ts';
import {
  SEGMENTED_ITEM_CLASS,
  SEGMENTED_TRACK_CLASS,
} from '#/components/forms/segmented-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

const KINDS: { key: AmountKind; label: string; dot: string }[] = [
  { key: 'expense', label: 'Despesa', dot: 'text-loss' },
  { key: 'income', label: 'Receita', dot: 'text-gain' },
];

type AmountKindToggleProps = {
  value: AmountKind;
  onChange: (kind: AmountKind) => void;
  /** Accessible name of the group. */
  label: string;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Despesa | Receita above the amount. The chosen side slides in with its tone as a soft fill and a
 * tilted card-dot (the system's notch) in the tone color; the word stays in the primary text (the
 * tone text on the weak fill is 4.3:1, short of AA), and it is the word, not the color, that
 * carries the meaning.
 */
export function AmountKindToggle({
  value,
  onChange,
  label,
  isDisabled,
  className,
}: AmountKindToggleProps) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next === 'expense' || next === 'income') onChange(next);
      }}
      isDisabled={isDisabled}
      className={cx(SEGMENTED_TRACK_CLASS, 'relative w-full data-[disabled]:opacity-50', className)}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-s4">
        <span
          data-kind={value}
          className={cx(
            'block h-full w-1/2 rounded-capsule',
            'transition-[transform,background-color] duration-(--duration-slide) ease-(--ease-standard)',
            value === 'income' ? 'translate-x-full bg-gain-weak' : 'bg-loss-weak',
          )}
        />
      </span>
      {KINDS.map((kind) => (
        <ToggleButton
          key={kind.key}
          id={kind.key}
          className={({ isSelected }) =>
            cx(
              SEGMENTED_ITEM_CLASS,
              isSelected ? 'text-fg-primary' : 'text-fg-tertiary data-[hovered]:text-fg-primary',
            )
          }
        >
          {({ isSelected }) => (
            <>
              <span
                aria-hidden="true"
                className={cx(
                  'inline-block h-1.75 w-2.5 -rotate-8 rounded-(--radius-pingo) bg-current transition-colors duration-(--duration-fast)',
                  isSelected ? kind.dot : 'text-fg-tertiary',
                )}
              />
              <span className="relative truncate">{kind.label}</span>
            </>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
