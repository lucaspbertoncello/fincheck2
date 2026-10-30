import { Button } from '#/components/buttons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type SelectionToggleProps = {
  /** Selection mode is on. */
  active: boolean;
  /** Rows selected; shown in "Concluir · N" while the mode is on. */
  count: number;
  onToggle: () => void;
  className?: string;
};

/**
 * Entry of the selection mode (components.md 7): secondary "Selecionar" with a check icon; once on
 * it turns into the green text "Concluir · N". Always has a visible label, so the phone shows it
 * too (ui adjustment 8); pass the width in `className`.
 */
export function SelectionToggle({ active, count, onToggle, className }: SelectionToggleProps) {
  return active ? (
    <Button variant="tertiary" onPress={onToggle} className={cx('font-emphasis', className)}>
      Concluir · {count}
    </Button>
  ) : (
    <Button variant="secondary" icon="check" onPress={onToggle} className={className}>
      Selecionar
    </Button>
  );
}
