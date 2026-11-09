import { Button, Chip, Collapse } from '@fincheck/ui';

type MissingFilterChipProps = {
  isActive: boolean;
  onClear: () => void;
};

/**
 * "Só as que faltam" with "Limpar filtro": the state of `?show=missing`, opened and closed with the
 * filter. It sits in the 24 px column of the screen, so the track cancels that gap while closed.
 */
export function MissingFilterChip({ isActive, onClear }: MissingFilterChipProps) {
  return (
    <Collapse isOpen={isActive} trackClassName="-mt-s24" contentClassName="pt-s24">
      <div className="flex flex-wrap items-center gap-s8">
        <Chip tone="accent" large>
          Só as que faltam
        </Chip>
        <Button variant="tertiary" size="sm" onPress={onClear}>
          Limpar filtro
        </Button>
      </div>
    </Collapse>
  );
}
