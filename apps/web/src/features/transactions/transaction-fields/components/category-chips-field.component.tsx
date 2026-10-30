import { CategoryPicker, FieldSet, Icon, type CategoryOption } from '@fincheck/ui';
import { useState } from 'react';
import { Button as AriaButton, ToggleButton } from 'react-aria-components';

import {
  QUICK_CHIP_CLASS,
  QUICK_CHIP_ON_CLASS,
} from '#/features/transactions/transaction-fields/constants/quick-chip-class.constant.ts';

/** Shortcuts shown before "Outras…". More than this and the rest hide behind the search. */
const SHORTCUTS = 5;

type CategoryChipsFieldProps = {
  label?: string;
  /** Right of the label ("opcional"). */
  aside?: string;
  /** The categories of the kind, most used first (`rankCategoriesByUse`). */
  categories: readonly CategoryOption[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  error?: string;
  className?: string;
};

/**
 * Category as the thing people do: tap one of the few they use most, each with its icon, or open
 * "Outras…" to search the rest. A category picked from the search takes the last chip, so the choice
 * is always visible; tapping the chosen chip again clears it. With six categories or fewer all show.
 */
export function CategoryChipsField({
  label = 'Categoria',
  aside,
  categories,
  value,
  onChange,
  error,
  className,
}: CategoryChipsFieldProps) {
  const [searching, setSearching] = useState(false);
  const hasMore = categories.length > SHORTCUTS + 1;
  const shortcuts = hasMore ? categories.slice(0, SHORTCUTS) : categories;
  const chosen = categories.find((category) => category.id === value);
  const chips =
    chosen && !shortcuts.includes(chosen)
      ? [...shortcuts.slice(0, SHORTCUTS - 1), chosen]
      : shortcuts;

  return (
    <FieldSet label={label} aside={aside} error={error} className={className}>
      <div className="flex flex-wrap gap-s8">
        {chips.map((category) => {
          const selected = category.id === value;
          return (
            <ToggleButton
              key={category.id}
              isSelected={selected}
              onChange={() => {
                setSearching(false);
                onChange(selected ? null : category.id);
              }}
              className={selected ? `${QUICK_CHIP_CLASS} ${QUICK_CHIP_ON_CLASS}` : QUICK_CHIP_CLASS}
            >
              <Icon name={category.icon} size="md" />
              {category.name}
            </ToggleButton>
          );
        })}
        {hasMore ? (
          <AriaButton
            aria-expanded={searching}
            onPress={() => setSearching((current) => !current)}
            className={`${QUICK_CHIP_CLASS} border-dashed ${searching ? 'bg-subtle' : ''}`}
          >
            <Icon name="search" size="md" />
            Outras…
          </AriaButton>
        ) : null}
      </div>
      {searching ? (
        <CategoryPicker
          label="Buscar outra categoria"
          categories={categories}
          value={value}
          onChange={(categoryId) => {
            onChange(categoryId);
            if (categoryId) setSearching(false);
          }}
          autoFocus
          className="mt-s8"
        />
      ) : null}
    </FieldSet>
  );
}
