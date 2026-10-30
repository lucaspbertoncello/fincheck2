import { Button } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';

type MonthPickerProps = {
  /** "Outubro". */
  monthLabel: string;
  /** "2026". */
  yearLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

const ARROW =
  'group relative grid size-ctl-sm cursor-pointer place-items-center rounded-capsule text-fg-secondary outline-none transition-[background-color,color,transform] duration-(--duration-fast) after:absolute after:-inset-1.5 after:content-[""] data-[hovered]:bg-brand-weak data-[hovered]:text-brand data-[pressed]:scale-94 lg:size-8';

/** "‹ Outubro 2026 ›": the month is Fustat 700, the year is light. The month holds for the whole app. */
export function MonthPicker({ monthLabel, yearLabel, onPrevious, onNext }: MonthPickerProps) {
  return (
    <div role="group" aria-label="Mês" className="flex items-center gap-s4">
      <Button aria-label="Mês anterior" onPress={onPrevious} className={ARROW}>
        <Icon
          name="chevron-left"
          size="md"
          className="transition-transform duration-(--duration-fast) group-data-[hovered]:-translate-x-px"
        />
      </Button>
      <span
        aria-live="polite"
        className="min-w-0 text-center text-body whitespace-nowrap text-fg-primary lg:text-(length:--font-size-subsection-title)"
      >
        <span className="font-title font-bold">{monthLabel}</span>{' '}
        <span className="font-plain text-fg-secondary">{yearLabel}</span>
      </span>
      <Button aria-label="Próximo mês" onPress={onNext} className={ARROW}>
        <Icon
          name="chevron-right"
          size="md"
          className="transition-transform duration-(--duration-fast) group-data-[hovered]:translate-x-px"
        />
      </Button>
    </div>
  );
}
