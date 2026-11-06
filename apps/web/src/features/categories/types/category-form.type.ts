import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

/** What the category modal does: create one of a kind or edit an existing one. */
export type CategoryFormTarget =
  { mode: 'create'; kind: Category.Kind } | { mode: 'edit'; category: Category.Dto };

export type CategoryFormValues = {
  kind: Category.Kind;
  name: string;
  icon: Category.Icon;
};

export type CategoryFormErrors = {
  name?: string;
};
