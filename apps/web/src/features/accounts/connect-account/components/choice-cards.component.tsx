import { Icon, type IconName } from '@fincheck/ui';
import { Label, Radio, RadioGroup } from 'react-aria-components';

export type ChoiceCardOption<T extends string> = {
  value: T;
  label: string;
  icon: IconName;
  /** One line under the label; leave out for the compact card. */
  description?: string;
};

type ChoiceCardsProps<T extends string> = {
  label: string;
  options: readonly ChoiceCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Columns on a wide container: the options always fill the row. */
  columns: 2 | 4;
  /** The cards cannot change (an account keeps its type after it is created). */
  isDisabled?: boolean;
};

const COLUMNS = {
  2: 'grid-cols-1 @sm:grid-cols-2',
  4: 'grid-cols-2 @xl:grid-cols-4',
} as const;

/**
 * Choice as cards with an icon, for the few options that change the whole form (how to connect,
 * which kind of account). Radio semantics: arrows move the choice. The chosen card takes the weak
 * accent fill, the accent border and text; weight and border width never change, so nothing shifts.
 */
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
  columns,
  isDisabled,
}: ChoiceCardsProps<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as T)}
      isDisabled={isDisabled}
      className="@container flex flex-col gap-s4"
    >
      <Label className="text-label text-fg-secondary">{label}</Label>
      <div className={`grid gap-s8 ${COLUMNS[columns]}`}>
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            aria-label={option.label}
            className="focus-ring flex cursor-pointer items-center gap-s12 rounded-panel border border-line px-s12 py-s8 text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[hovered]:bg-subtle data-[pressed]:scale-98 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
          >
            <span
              aria-hidden="true"
              className="grid size-ctl-sm shrink-0 place-items-center rounded-capsule bg-field text-fg-secondary"
            >
              <Icon name={option.icon} size="md" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-label font-emphasis">{option.label}</span>
              {option.description ? (
                <span className="text-meta text-fg-secondary">{option.description}</span>
              ) : null}
            </span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
