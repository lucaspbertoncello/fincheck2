import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { useRef, useState } from 'react';

import { focusChosenCategory } from '#/shared/utils/categories/focus-chosen-category.util.ts';
import type { CategoryFormTarget } from '#/shared/types/categories/category-form.type.ts';

type Options = {
  /** The kind the new category takes: the one the field already lists. */
  kind: Category.Kind;
  /** The type is fixed (default): the field lists only that kind. False when both kinds fit. */
  lockKind?: boolean;
  /** What the modal says under its title, when the kind needs a word (a credit on a card). */
  subtitle?: string;
  /** The category was created: the field chooses it. */
  onCreated: (category: Category.Dto) => void;
};

/**
 * The link between a category picker's "Nova categoria" and the category modal: whether the modal
 * is open and with which typed name, and what to do with the category it creates. Spread
 * `formProps` on `<CategoryForm />` and give `open` to the picker's `onCreate`; the three category
 * fields (transaction, bill, recurrence) and the split use it the same way. When the modal closes
 * without creating anything, the field that was focused when it opened gets the focus back: the
 * picker's line vanishes with its list, so the modal has nothing left to give it back to. After a
 * creation it does not: the field would take focus only to open its list once more.
 */
export function useCategoryCreation({ kind, lockKind = true, subtitle, onCreated }: Options) {
  const [typedName, setTypedName] = useState<string | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const created = useRef(false);
  const target: CategoryFormTarget | null =
    typedName === null ? null : { mode: 'create', kind, name: typedName, subtitle, lockKind };

  return {
    open: (name: string) => {
      returnTo.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      created.current = false;
      setTypedName(name);
    },
    formProps: {
      target,
      onClose: () => {
        setTypedName(null);
        const field = returnTo.current;
        returnTo.current = null;
        // After the modal is gone; a field that folded meanwhile (the search) cannot take it.
        requestAnimationFrame(() => {
          if (!field) return;
          if (created.current) {
            // The search folded with the choice: the focus goes to the chip of the new category.
            if (!field.isConnected || field.closest('[inert]')) focusChosenCategory(field);
            return;
          }
          if (field.isConnected && !field.closest('[inert]')) field.focus();
        });
      },
      onCreated: (category: Category.Dto) => {
        created.current = true;
        onCreated(category);
      },
    },
  };
}
