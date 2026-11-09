import type { AmountKind } from '#/components/forms/amount-kind.type.ts';
import { SegmentedControl } from '#/components/forms/segmented-control.component.tsx';
import type { SegmentedOption } from '#/components/forms/segmented-control.type.ts';

const KIND_OPTIONS: SegmentedOption[] = [
  { key: 'expense', label: 'Despesa', tone: 'loss' },
  { key: 'income', label: 'Receita', tone: 'gain' },
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
 * Despesa | Receita above the amount: the `direction` segmented control with the two kinds. The
 * chosen side takes its tone as a soft fill and a tilted card-dot (the system's notch) in the tone
 * color; the word stays in the primary text (the tone text on the weak fill is 4.3:1, short of
 * AA), and it is the word, not the color, that carries the meaning. The pill slides from one side
 * to the other and changes color on the way, like every other selector (`SegmentedSlide`).
 */
export function AmountKindToggle({
  value,
  onChange,
  label,
  isDisabled,
  className,
}: AmountKindToggleProps) {
  return (
    <SegmentedControl
      direction
      options={KIND_OPTIONS}
      value={value}
      onChange={(key) => {
        if (key === 'expense' || key === 'income') onChange(key);
      }}
      label={label}
      isDisabled={isDisabled}
      className={className}
    />
  );
}
