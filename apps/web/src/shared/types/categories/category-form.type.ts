import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

/**
 * What the category modal does: create one of a kind or edit an existing one. From a picker's
 * "Nova categoria" the name comes typed, the subtitle says what the kind means there, and
 * `lockKind` keeps the type fixed, since the field only lists that kind.
 */
export type CategoryFormTarget =
  | { mode: 'create'; kind: Category.Kind; name?: string; subtitle?: string; lockKind?: boolean }
  | { mode: 'edit'; category: Category.Dto };

export type CategoryFormValues = {
  kind: Category.Kind;
  name: string;
  icon: Category.Icon;
};

export type CategoryFormErrors = {
  name?: string;
};
