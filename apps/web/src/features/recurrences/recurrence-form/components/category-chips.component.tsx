import { CategoryPicker, Collapse, FieldSet, Icon } from '@fincheck/ui';
import type { CategoryOption, IconName } from '@fincheck/ui';
import { useState } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';

type CategoryChipsProps = {
  label: string;
  /** Every category of the type, the most used first. */
  categories: readonly CategoryOption[];
  value: string | null;
  onChange: (categoryId: string) => void;
  className?: string;
};

const OTHERS_KEY = 'others';
const SHOWN = 3;

type ChipOption = { key: string; label: string; icon: IconName };

/**
 * Category as touch shortcuts: the three most used of the type as chips with their icon, then
 * "Outras…", which opens the search for the rest. A category picked from the search takes the place
 * of the third chip, so the choice is always visible and the group never gets taller. Four compact
 * chips (12 px of side padding, small icon) make two rows in the half-width column of the modal.
 */
export function CategoryChips({
  label,
  categories,
  value,
  onChange,
  className,
}: CategoryChipsProps) {
  const [searching, setSearching] = useState(false);

  if (categories.length === 0) {
    return (
      <FieldSet label={label} className={className}>
        <p className="text-meta text-fg-tertiary">Nenhuma categoria deste tipo ainda.</p>
      </FieldSet>
    );
  }

  const top = categories.slice(0, SHOWN);
  const chosen = categories.find((category) => category.id === value);
  // A category picked from the search takes the last place, so the row keeps its length and height.
  const shown = chosen && !top.includes(chosen) ? [...top.slice(0, SHOWN - 1), chosen] : top;
  const options: ChipOption[] = shown.map((category) => ({
    key: category.id,
    label: category.name,
    icon: category.icon,
  }));
  if (categories.length > shown.length) {
    options.push({ key: OTHERS_KEY, label: 'Outras…', icon: 'search' });
  }

  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <RadioGroup
        value={searching ? OTHERS_KEY : value}
        onChange={(key) => {
          if (key === OTHERS_KEY) return setSearching(true);
          setSearching(false);
          onChange(key);
        }}
        className="flex flex-col gap-s4"
      >
        <Label className="text-label text-fg-secondary">{label}</Label>
        <div className="flex flex-wrap gap-s8">
          {options.map((option) => (
            <Radio
              key={option.key}
              value={option.key}
              className="focus-ring inline-flex h-ctl-tab cursor-pointer items-center gap-s4 rounded-capsule border border-line px-s12 text-label whitespace-nowrap text-fg-primary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
            >
              <Icon name={option.icon} size="sm" />
              {option.label}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <Collapse isOpen={searching} contentClassName="pt-s8">
        <CategoryPicker
          label="Buscar outra categoria"
          categories={categories}
          value={value}
          autoFocus
          onChange={(categoryId) => {
            if (categoryId === null) return;
            setSearching(false);
            onChange(categoryId);
          }}
        />
      </Collapse>
    </div>
  );
}
