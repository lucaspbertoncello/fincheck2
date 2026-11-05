import { Button } from '@fincheck/ui';

type InvoiceSwitcherProps = {
  /** False when there is no invoice before (the arrow waits). */
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

/** The arrows ‹ › to the invoice before and the one after, in the place of the period picker. */
export function InvoiceSwitcher({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: InvoiceSwitcherProps) {
  return (
    <div role="group" aria-label="Faturas do cartão" className="flex items-center gap-s8">
      <Button
        iconOnly
        variant="secondary"
        size="sm"
        icon="chevron-left"
        label="Fatura anterior"
        isDisabled={!hasPrevious}
        onPress={onPrevious}
      />
      <Button
        iconOnly
        variant="secondary"
        size="sm"
        icon="chevron-right"
        label="Fatura seguinte"
        isDisabled={!hasNext}
        onPress={onNext}
      />
    </div>
  );
}
