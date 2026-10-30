import {
  Button as AriaButton,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from 'react-aria-components';

import { Icon } from '#/components/icons/index.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { FIELD_LABEL_CLASS } from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type CategorySelectProps = {
  label: string;
  categories: readonly CategoryOption[];
  value: string | null;
  onChange: (categoryId: string) => void;
  className?: string;
};

/** Category dropdown for a part of a split: 48 px button, listbox popover with 44 px items. */
export function CategorySelect({
  label,
  categories,
  value,
  onChange,
  className,
}: CategorySelectProps) {
  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
      placeholder="Escolher categoria"
      className={cx('flex min-w-0 flex-col gap-s4', className)}
    >
      <Label className={FIELD_LABEL_CLASS}>{label}</Label>
      <AriaButton className="focus-ring flex min-h-ctl-field w-full cursor-pointer items-center justify-between gap-s8 rounded-input border border-line bg-field px-s16 text-left text-body text-fg-primary data-[pressed]:bg-subtle">
        <SelectValue className="min-w-0 flex-1 truncate data-[placeholder]:text-fg-tertiary" />
        <Icon name="chevron-down" size="sm" className="text-fg-secondary" />
      </AriaButton>
      <Popover className="popover-enter w-(--trigger-width) rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)">
        <ListBox className="max-h-72 overflow-auto p-s8 outline-none">
          {categories.map((category) => (
            <ListBoxItem
              key={category.id}
              id={category.id}
              textValue={category.name}
              className="flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s12 text-list text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle data-[selected]:text-brand"
            >
              <Icon name={category.icon} size="md" className="text-fg-secondary" />
              {category.name}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
