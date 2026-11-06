import { Button } from '#/components/buttons/index.ts';
import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type ExpectedValueUpdateProps = {
  /** What was charged, which becomes the new expected amount (cents). */
  newCents: number;
  /** The current expected amount, kept by "Manter" (cents). */
  keptCents: number;
  onUpdate: () => void;
  onKeep: () => void;
  className?: string;
};

/**
 * The decision of a different amount (10.1): "Atualizar para R$ 23,90" (primary) and "Manter
 * R$ 21,90" (secondary), the same pill buttons as every other action strip. The row detail already
 * says what was charged; the amounts in the labels are one piece, in the color of the label.
 * It goes on the action strip of the row (`RecurrenceRow` `decision`).
 */
export function ExpectedValueUpdate({
  newCents,
  keptCents,
  onUpdate,
  onKeep,
  className,
}: ExpectedValueUpdateProps) {
  return (
    <div className={cx('flex flex-wrap items-center gap-s8', className)}>
      <Button size="sm" variant="primary" onPress={onUpdate}>
        <span>
          Atualizar para <Money cents={newCents} sign="none" weight="plain" currency="inline" />
        </span>
      </Button>
      <Button size="sm" variant="secondary" onPress={onKeep}>
        <span>
          Manter <Money cents={keptCents} sign="none" weight="plain" currency="inline" />
        </span>
      </Button>
    </div>
  );
}
