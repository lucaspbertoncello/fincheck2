import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { Icon } from '@fincheck/ui';
import { Label, Radio, RadioGroup } from 'react-aria-components';

import { CATEGORY_ICON_LABELS } from '#/features/categories/constants/category-icon-labels.constant.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

type IconPickerProps = {
  value: Category.Icon;
  onChange: (icon: Category.Icon) => void;
};

/** The icons a category may use, one selected (radio group: arrows move, the focus ring shows). */
export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as Category.Icon)}
      orientation="horizontal"
      className="flex flex-col gap-s8"
    >
      <Label className="text-label text-fg-secondary">Ícone</Label>
      <div className="flex flex-wrap gap-s8">
        {CATEGORY_ICONS.map((icon) => (
          <Radio
            key={icon}
            value={icon}
            aria-label={CATEGORY_ICON_LABELS[icon]}
            className="focus-ring grid size-ctl-touch cursor-pointer place-items-center rounded-capsule border border-line text-fg-secondary transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
          >
            <Icon name={mapCategoryIcon(icon)} size="base" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
