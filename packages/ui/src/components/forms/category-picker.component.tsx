import { useContext, useEffect, useState } from 'react';
import {
  Button as AriaButton,
  ComboBox,
  ComboBoxStateContext,
  Group,
  Header,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Text,
  useFilter,
} from 'react-aria-components';

import {
  FIELD_BOX_CLASS,
  FIELD_DESCRIPTION_CLASS,
  FIELD_LABEL_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { getCategoryCreateName } from '#/components/forms/get-category-create-name.util.ts';
import { splitCategoryGroups } from '#/components/forms/split-category-groups.util.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { cx } from '#/utils/class-names.util.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';

/** Key and search text of the "Nova categoria" line: not a category, so the filter always keeps it. */
const CREATE_KEY = '__create-category__';
const CREATE_TEXT = '__create-category-text__';

type CategoryPickerProps = {
  label: string;
  categories: readonly CategoryOption[];
  /** Id of the chosen category; null shows none ("Sem categoria"). */
  value: string | null;
  onChange: (categoryId: string | null) => void;
  placeholder?: string;
  /** A line under the heading of a group (key: the group), for what the group means. */
  groupHints?: Readonly<Record<string, string>>;
  /**
   * Turns on the line at the end of the list that creates a category: "Nova categoria" always, and
   * `Criar categoria "texto"` when the typed text is no category yet. Pressing it calls this with
   * the typed name ('' for the fixed line); the app opens its form and, when it creates one, chooses
   * it with `onChange`. Without it the list only chooses.
   */
  onCreate?: (name: string) => void;
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
 * single focus ring as the text field. With 6 categories or fewer prefer `ChoiceField`. Options
 * that carry a `group` are listed under its heading, in the order they come; the search filters
 * inside the groups and a group with no match goes away. With `onCreate` the list ends in the line
 * that creates a category, outside the groups, which stays when the search matches nothing.
 */
export function CategoryPicker({
  label,
  categories,
  value,
  onChange,
  placeholder = 'Buscar categoria',
  groupHints,
  onCreate,
  description,
  error,
  isDisabled,
  autoFocus,
  className,
}: CategoryPickerProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const [typed, setTyped] = useState('');
  const chosen = categories.find((category) => category.id === value);
  const groups = splitCategoryGroups(categories);
  const isGrouped = groups.some((group) => group.label !== undefined);

  const createName = onCreate ? getCategoryCreateName(categories, typed) : '';

  function renderOption(category: CategoryOption) {
    return (
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
    );
  }

  return (
    <ComboBox
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key === CREATE_KEY) onCreate?.(createName);
        else onChange(key === null ? null : String(key));
      }}
      onInputChange={setTyped}
      defaultFilter={(text, input) => text === CREATE_TEXT || contains(text, input)}
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
      <FieldErrorMessage error={error} />
      <Popover className="popover-enter w-(--trigger-width) rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)">
        {onCreate ? <NoCategoryMatch /> : null}
        {onCreate ? <ActivateFirstLine typed={typed} /> : null}
        <ListBox
          renderEmptyState={() => (
            <p className="px-s12 py-s16 text-label text-fg-secondary">Nenhuma categoria assim.</p>
          )}
          className="max-h-64 overflow-auto p-s8 outline-none"
        >
          {isGrouped
            ? groups.map((group) => (
                <ListBoxSection
                  key={group.label ?? ''}
                  id={`group:${group.label ?? ''}`}
                  className="mt-s8 first:mt-0"
                >
                  {group.label ? (
                    <Header className="px-s8 pb-s4 text-meta text-fg-secondary">
                      <span className="block font-emphasis">{group.label}</span>
                      {groupHints?.[group.label] ? (
                        // React Aria does not pass `aria-describedby` to a section, so the line stays
                        // in the heading: the group's name is the label followed by it.
                        <span className="block">{groupHints[group.label]}</span>
                      ) : null}
                    </Header>
                  ) : null}
                  {group.options.map(renderOption)}
                </ListBoxSection>
              ))
            : categories.map(renderOption)}
          {onCreate ? (
            <ListBoxItem
              id={CREATE_KEY}
              textValue={CREATE_TEXT}
              aria-label={createName ? `Criar categoria "${createName}"` : 'Nova categoria'}
              className={cx(
                'flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s8 text-list font-emphasis text-brand outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle',
                isGrouped && 'mt-s8',
              )}
            >
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center">
                <Icon name="plus-circle" size="sm" />
              </span>
              <span aria-hidden="true" className="min-w-0 flex-1 truncate">
                {createName ? `Criar categoria "${createName}"` : 'Nova categoria'}
              </span>
            </ListBoxItem>
          ) : null}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

/**
 * "Nenhuma categoria assim." above the "Criar categoria" line: with that line in the list the list is
 * never empty, so the empty state of the list cannot say it. Reads what the search left.
 */
function NoCategoryMatch() {
  const state = useContext(ComboBoxStateContext);
  if (!state) return null;
  const hasCategory = [...state.collection].some(
    (node) => node.type === 'section' || node.key !== CREATE_KEY,
  );
  if (hasCategory) return null;

  return (
    <p className="px-s12 pt-s12 pb-s4 text-label text-fg-secondary">Nenhuma categoria assim.</p>
  );
}

/**
 * With text typed, the first line of the list is the active one, so Enter picks it (the best match
 * or, with no match, "Criar categoria") without an arrow first: React Aria clears the focused line
 * every time the text changes, and the `TagPicker` does the same. Renders nothing.
 */
function ActivateFirstLine({ typed }: { typed: string }) {
  const state = useContext(ComboBoxStateContext);
  const collection = state?.collection;
  useEffect(() => {
    if (!state || !collection || typed.trim() === '') return;
    let key = collection.getFirstKey();
    while (key !== null) {
      const node = collection.getItem(key);
      if (node?.type === 'item') {
        state.selectionManager.setFocusedKey(key);
        return;
      }
      key = collection.getKeyAfter(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the manager is stable; only the text and the list move it
  }, [typed, collection]);

  return null;
}
