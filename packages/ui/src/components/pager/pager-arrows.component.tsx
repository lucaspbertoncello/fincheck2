import { ArrowButton } from '#/components/buttons/arrow-button.component.tsx';

type PagerArrowsProps = {
  /** "Cartões anteriores". */
  previousLabel: string;
  /** "Próximos cartões". */
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** An arrow at its end stays in place, dimmed, with no press and no focus. */
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
};

/**
 * The two arrows of a pager, made to sit at the right end of a section title line: they keep their
 * 32 px (36 on the phone) and never change the layout of the line when they come or go.
 */
export function PagerArrows({
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
}: PagerArrowsProps) {
  return (
    <div role="group" aria-label="Paginação" className="flex items-center gap-s4">
      <ArrowButton
        direction="previous"
        label={previousLabel}
        onPress={onPrevious}
        isDisabled={isPreviousDisabled}
      />
      <ArrowButton
        direction="next"
        label={nextLabel}
        onPress={onNext}
        isDisabled={isNextDisabled}
      />
    </div>
  );
}
