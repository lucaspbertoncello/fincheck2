import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import {
  CategoryIcon,
  CategoryPicker,
  Collapse,
  FieldSet,
  type CategoryOption,
} from '@fincheck/ui';
import { useState } from 'react';
import { ToggleButton } from 'react-aria-components';

import { CategoryForm } from '#/shared/components/categories/category-form/category-form.component.tsx';
import {
  CHIP_CLASS,
  CHIP_GHOST_CLASS,
  CHIP_ON_CLASS,
} from '#/shared/constants/chip/chip-class.constant.ts';
import { useCategoryCreation } from '#/shared/hooks/categories/use-category-creation.hook.ts';

/** How many categories show as chips before "Outras…". */
const SHORTCUTS = 5;

type CategoryChipsFieldProps = {
  label: string;
  /** The categories to choose from. */
  categories: readonly CategoryOption[];
  /** The id of the "no category" choice, kept out of the chips. */
  noneId: string;
  /** The chosen id, or `noneId`. */
  value: string;
  onChange: (id: string) => void;
  /** The kind a category created from the search takes (the type of the bill). */
  newCategoryKind: Category.Kind;
  error?: string;
};

/**
 * Category as shortcuts, not as a select: the first few categories of the type are chips with
 * their own icon, the chosen one is always visible, and "Outras…" opens the search for the rest
 * (always there, since it is also where a new category is created).
 * Tapping the chosen chip again clears it (the field is optional). The search ends in "Nova
 * categoria": the modal opens and the new category comes back chosen.
 */
export function CategoryChipsField({
  label,
  categories,
  noneId,
  value,
  onChange,
  newCategoryKind,
  error,
}: CategoryChipsFieldProps) {
  const [searching, setSearching] = useState(false);
  const creation = useCategoryCreation({
    kind: newCategoryKind,
    onCreated: (category) => {
      setSearching(false);
      onChange(category.id);
    },
  });
  const real = categories.filter((category) => category.id !== noneId);
  const chosen = real.find((category) => category.id === value);

  const shown = real.slice(0, SHORTCUTS);
  if (chosen && !shown.some((category) => category.id === chosen.id)) {
    shown.splice(SHORTCUTS - 1, 1, chosen); // the choice never hides behind "Outras…"
  }

  return (
    <>
      <FieldSet label={label} aside="opcional" error={error}>
        <div className="flex flex-wrap gap-s8">
          {shown.map((category) => {
            const selected = category.id === value;
            return (
              <ToggleButton
                key={category.id}
                isSelected={selected}
                onChange={() => onChange(selected ? noneId : category.id)}
                className={`${CHIP_CLASS} ${selected ? CHIP_ON_CLASS : ''}`}
              >
                <CategoryIcon icon={category.icon} size="sm" className="-ml-s8" />
                {category.name}
              </ToggleButton>
            );
          })}
          <ToggleButton
            isSelected={searching}
            onChange={setSearching}
            className={`${CHIP_CLASS} ${CHIP_GHOST_CLASS}`}
          >
            Outras…
          </ToggleButton>
        </div>
        <Collapse isOpen={searching} bleedY contentClassName="pt-s8">
          <CategoryPicker
            label="Buscar categoria"
            categories={real}
            onCreate={creation.open}
            value={chosen?.id ?? null}
            onChange={(id) => {
              onChange(id ?? noneId);
              setSearching(false);
            }}
            autoFocus
          />
        </Collapse>
      </FieldSet>
      <CategoryForm {...creation.formProps} />
    </>
  );
}
