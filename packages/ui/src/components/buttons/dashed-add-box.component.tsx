import { Button } from 'react-aria-components';

import { PlusMark } from '#/components/categories/plus-mark.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type DashedAddBoxProps = {
  /** What it adds ("Adicionar cartão de crédito"). */
  label: string;
  onPress: () => void;
  className?: string;
};

/**
 * The empty place of a grid that invites an addition: a box with a dashed border and the dashed
 * "+" mark over the label, the same pattern as the "Nova ..." rows and the ghost chips. It fills
 * the cell it is given, so beside a card it takes the card's size.
 */
export function DashedAddBox({ label, onPress, className }: DashedAddBoxProps) {
  return (
    <Button
      onPress={onPress}
      className={cx(
        'focus-ring flex min-h-ctl-touch w-full cursor-pointer flex-col items-center justify-center gap-s12 rounded-panel border border-dashed border-fg-tertiary p-s16 text-center text-label whitespace-nowrap text-fg-secondary transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle data-[hovered]:text-fg-primary',
        className,
      )}
    >
      <PlusMark />
      {label}
    </Button>
  );
}
