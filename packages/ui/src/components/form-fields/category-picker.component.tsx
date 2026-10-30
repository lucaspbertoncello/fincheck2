import {
  Button as AriaButton,
  ComboBox,
  FieldError,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Text,
  useFilter,
} from 'react-aria-components';

import {
  FIELD_BOX_CLASS,
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type CategoryPickerProps = {
  label: string;
  categories: readonly CategoryOption[];
  /** Id of the chosen category; null shows none ("Sem categoria"). */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  placeholder?: string;
  description?: string;
  error?: string;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

/**
 * Category as a searchable list with the category's own icon, for the many categories of a real
 * chart of accounts: type "mer" and "Mercado" is one key away; open it to see the icons. The
 * chosen category's icon sits in the field. Arrows, Enter and Esc as in any combobox; the same
 * single focus ring as the text field. With 6 categories or fewer prefer `ChoiceField`.
 */
export function CategoryPicker({
  label,
  categories,
  value,
  onChange,
  placeholder = 'Buscar categoria',
  description,
  error,
  isDisabled,
  autoFocus,
  className,
}: CategoryPickerProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const chosen = categories.find((category) => category.id === value);

  return (
    <ComboBox
      selectedKey={value}
      onSelectionChange={(key) => onChange(key === null ? null : String(key))}
      defaultFilter={contains}
      menuTrigger="focus"
      isDisabled={isDisabled}
      autoFocus={autoFocus}
      isInvalid={error ? true : undefined}
      className={cx('flex min-w-0 flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <Group className={cx(FIELD_BOX_CLASS, 'flex items-center gap-s12 pr-s4 pl-s8')}>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center">
          {chosen ? (
            <CategoryIcon icon={chosen.icon} size="sm" />
          ) : (
            <Icon name="search" size="base" className="text-fg-tertiary" />
          )}
        </span>
        <Input
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-body text-fg-primary outline-none placeholder:text-fg-tertiary"
        />
        <AriaButton
          aria-label="Ver categorias"
          className="focus-ring grid size-ctl-touch shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary data-[hovered]:text-fg-primary"
        >
          <Icon name="chevron-down" size="sm" />
        </AriaButton>
      </Group>
      {description ? (
        <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
          {description}
        </Text>
      ) : null}
      <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
      <Popover className="popover-enter w-(--trigger-width) rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)">
        <ListBox
          renderEmptyState={() => (
            <p className="px-s12 py-s16 text-label text-fg-secondary">Nenhuma categoria assim.</p>
          )}
          className="max-h-64 overflow-auto p-s8 outline-none"
        >
          {categories.map((category) => (
            <ListBoxItem
              key={category.id}
              id={category.id}
              textValue={category.name}
              className="group flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s8 text-list text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle data-[selected]:text-brand"
            >
              <CategoryIcon icon={category.icon} size="sm" />
              <span className="min-w-0 flex-1 truncate">{category.name}</span>
              <Icon name="check" size="sm" className="invisible group-data-[selected]:visible" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}
