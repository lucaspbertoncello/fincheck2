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
  /** Money flow of the recurrence: "income" paints the values green, the default is red. */
  flow?: 'income' | 'expense';
  className?: string;
};

/** "Atualizar o valor esperado para R$ 23,90?" with "Atualizar" and "Manter R$ 21,90" (10.1). It goes on the action strip of the row (`RecurrenceRow` `decision`). */
export function ExpectedValueUpdate({
  newCents,
  keptCents,
  onUpdate,
  onKeep,
  flow = 'expense',
  className,
}: ExpectedValueUpdateProps) {
  return (
    <div className={cx('flex flex-wrap items-center gap-x-s12 gap-y-s8', className)}>
      <p className="text-label text-fg-primary">
        Atualizar o valor esperado para{' '}
        <Money cents={newCents} sign="none" weight="plain" tone={flow} className="text-label" />?
      </p>
      <Button size="sm" variant="secondary" onPress={onUpdate}>
        Atualizar
      </Button>
      <Button size="sm" variant="tertiary" onPress={onKeep}>
        Manter{' '}
        <Money cents={keptCents} sign="none" weight="plain" tone={flow} className="text-label" />
      </Button>
    </div>
  );
}
