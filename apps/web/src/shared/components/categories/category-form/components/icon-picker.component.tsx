import { CATEGORY_ICONS } from '@fincheck/shared/categories/category/category.constant.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { Icon } from '@fincheck/ui';
import { Label, Radio, RadioGroup } from 'react-aria-components';

import { CATEGORY_ICON_LABELS } from '#/shared/constants/categories/category-icon-labels.constant.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

type IconPickerProps = {
  value: Category.Icon;
  onChange: (icon: Category.Icon) => void;
};

/**
 * The icons a category may use as a grid, one selected (radio group: arrows move, the focus ring
 * shows). Six per row so the whole set is seen at once; the chosen one gets the accent fill and
 * border, and nothing changes size or weight.
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as Category.Icon)}
      orientation="horizontal"
      className="flex flex-col gap-s8"
    >
      <Label className="sr-only">Ícone</Label>
      <div className="grid grid-cols-6 gap-s8">
        {CATEGORY_ICONS.map((icon) => (
          <Radio
            key={icon}
            value={icon}
            aria-label={CATEGORY_ICON_LABELS[icon]}
            className="focus-ring grid aspect-square min-h-ctl-touch cursor-pointer place-items-center rounded-capsule border border-line text-fg-secondary transition-[transform,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak data-[selected]:text-brand"
          >
            <Icon name={mapCategoryIcon(icon)} size="base" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
