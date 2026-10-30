import { CategoryPicker, ChoiceField, FieldSet } from '@fincheck/ui';
import type { CategoryOption } from '@fincheck/ui';
import { useState } from 'react';

type CategoryChipsProps = {
  label: string;
  /** Every category of the type, the most used first. */
  categories: readonly CategoryOption[];
  value: string | null;
  onChange: (categoryId: string) => void;
};

const OTHERS_KEY = 'others';
const SHOWN = 4;

/**
 * Category as touch shortcuts: the four most used of the type as chips with their icon, then
 * "Outras…", which opens the search for the rest. A category picked from the search stays among the
 * chips, so the choice is always visible.
 */
export function CategoryChips({ label, categories, value, onChange }: CategoryChipsProps) {
  const [searching, setSearching] = useState(false);

  if (categories.length === 0) {
    return (
      <FieldSet label={label}>
        <p className="text-meta text-fg-tertiary">Nenhuma categoria deste tipo ainda.</p>
      </FieldSet>
    );
  }

  const top = categories.slice(0, SHOWN);
  const chosen = categories.find((category) => category.id === value);
  const shown = chosen && !top.includes(chosen) ? [...top, chosen] : top;
  const options = shown.map((category) => ({
    key: category.id,
    label: category.name,
    icon: category.icon,
  }));
  if (categories.length > shown.length) {
    options.push({ key: OTHERS_KEY, label: 'Outras…', icon: 'search' });
  }

  return (
    <div className="flex flex-col gap-s8">
      <ChoiceField
        label={label}
        options={options}
        value={searching ? OTHERS_KEY : value}
        onChange={(key) => {
          if (key === OTHERS_KEY) return setSearching(true);
          setSearching(false);
          onChange(key);
        }}
      />
      {searching ? (
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
      ) : null}
    </div>
  );
}
