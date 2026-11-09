import { CategoryPicker, Collapse, FieldSet, Icon, type CategoryOption } from '@fincheck/ui';
import { useState } from 'react';
import { Button as AriaButton, ToggleButton } from 'react-aria-components';

import { CREDIT_CATEGORY_GROUP_HINTS } from '#/shared/constants/transactions/credit-category-groups.constant.ts';
import { describeCreditCategoryGroup } from '#/shared/utils/transactions/describe-credit-category-group.util.ts';
import { CHIP_CLASS, CHIP_ON_CLASS } from '#/shared/constants/chip/chip-class.constant.ts';

/** Shortcuts shown before "Outras…". More than this and the rest hide behind the search. */
const SHORTCUTS = 5;

type CategoryChipsFieldProps = {
  label?: string;
  /** Right of the label ("opcional"). */
  aside?: string;
  /**
   * The categories of the kind, most used first (`rankCategoriesByUse`). With two groups (a credit on
   * a card) the chips are the most used of the first group, and "Outras…" opens both.
   */
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
 * With groups, a line under the chips says what the group of the chosen category (or of the chips)
 * means.
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
  const firstGroup = categories[0]?.group;
  const isGrouped = categories.some((category) => category.group !== firstGroup);
  // The chips are the most used of the first group; the other groups wait in the search.
  const pool = isGrouped
    ? categories.filter((category) => category.group === firstGroup)
    : categories;
  const hasMore = isGrouped || categories.length > SHORTCUTS + 1;
  const shortcuts = pool.length > SHORTCUTS + 1 ? pool.slice(0, SHORTCUTS) : pool;
  const chosen = categories.find((category) => category.id === value);
  const chips =
    chosen && !shortcuts.includes(chosen)
      ? [...shortcuts.slice(0, SHORTCUTS - 1), chosen]
      : shortcuts;
  // What the group of the chosen category (or of the chips, while none is chosen) does to the credit.
  const activeGroup = (chosen ?? categories[0])?.group;
  const groupHint = isGrouped ? describeCreditCategoryGroup(activeGroup) : undefined;

  return (
    <FieldSet
      label={label}
      aside={aside}
      description={groupHint}
      error={error}
      className={className}
    >
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
              className={selected ? `${CHIP_CLASS} ${CHIP_ON_CLASS}` : CHIP_CLASS}
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
            className={`${CHIP_CLASS} border-dashed ${searching ? 'bg-subtle' : ''}`}
          >
            <Icon name="search" size="md" />
            Outras…
          </AriaButton>
        ) : null}
      </div>
      <Collapse isOpen={searching} contentClassName="pt-s8">
        <CategoryPicker
          label="Buscar outra categoria"
          categories={categories}
          groupHints={CREDIT_CATEGORY_GROUP_HINTS}
          value={value}
          onChange={(categoryId) => {
            onChange(categoryId);
            if (categoryId) setSearching(false);
          }}
          autoFocus
        />
      </Collapse>
    </FieldSet>
  );
}
