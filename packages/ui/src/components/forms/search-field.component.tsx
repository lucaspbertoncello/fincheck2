import { Button, Input, SearchField as AriaSearchField } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name and placeholder ("Buscar transações"). */
  label: string;
  /** Accessible name of the clear button. */
  clearLabel?: string;
  onSubmit?: (value: string) => void;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Search pill, 44 px (components.md 5.4): icon, text and a clear button that appears with text.
 * Esc clears. 16 px text on the phone, 15 on the desktop; fills the row when the parent is flex.
 */
export function SearchField({
  value,
  onChange,
  label,
  clearLabel = 'Limpar busca',
  onSubmit,
  isDisabled,
  className,
}: SearchFieldProps) {
  return (
    <AriaSearchField
      aria-label={label}
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      isDisabled={isDisabled}
      className={cx(
        'field-ring group flex h-ctl-touch min-w-0 items-center gap-s8 rounded-capsule border border-line bg-field px-s16 data-[disabled]:opacity-50',
        className,
      )}
    >
      <Icon name="search" size="base" className="text-fg-secondary" />
      <Input
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-tertiary lg:text-list [&::-webkit-search-cancel-button]:hidden"
      />
      <Button
        aria-label={clearLabel}
        className="focus-ring -mr-s8 grid size-ctl-touch shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary group-data-[empty]:hidden data-[hovered]:text-fg-primary"
      >
        <Icon name="close" size="base" />
      </Button>
    </AriaSearchField>
  );
}
