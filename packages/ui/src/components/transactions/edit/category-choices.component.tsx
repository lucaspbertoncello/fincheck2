import { useId } from 'react';

import { ChoiceChip } from '#/components/chips/index.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import {} from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';

type CategoryChoicesProps = {
  label: string;
  categories: readonly CategoryOption[];
  /** Selected category id; null shows none selected ("Sem categoria"). */
  value: string | null;
  onChange: (categoryId: string) => void;
  /** A line under the chips, linked to the group as its description. */
  description?: string;
  error?: string;
  className?: string;
};

/** The categories as choice chips (components.md 6.1), one selected, with the error under them. */
export function CategoryChoices({
  label,
  categories,
  value,
  onChange,
  description,
  error,
  className,
}: CategoryChoicesProps) {
  const descriptionId = useId();

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      className={cx('flex flex-col gap-s8', className)}
    >
      <span className="text-label text-fg-secondary">{label}</span>
      <div className="flex flex-wrap gap-s8">
        {categories.map((category) => (
          <ChoiceChip
            key={category.id}
            icon={category.icon}
            selected={category.id === value}
            onChange={() => onChange(category.id)}
          >
            {category.name}
          </ChoiceChip>
        ))}
      </div>
      {description ? (
        <p id={descriptionId} className="text-meta text-fg-secondary">
          {description}
        </p>
      ) : null}
      <FieldErrorMessage error={error} gap="s8" inField={false} />
    </div>
  );
}
