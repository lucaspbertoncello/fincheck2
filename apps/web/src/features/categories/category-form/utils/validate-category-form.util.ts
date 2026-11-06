import { createCategoryRequestSchema } from '@fincheck/shared/categories/category/category.schema.ts';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';

import type {
  CategoryFormErrors,
  CategoryFormValues,
} from '#/features/categories/types/category-form.type.ts';

type CategoryFormResult =
  { ok: true; body: Category.CreateRequest } | { ok: false; errors: CategoryFormErrors };

/** Checks the form with the request schema of the contract; the messages are the screen's, in pt-BR. */
export function validateCategoryForm(values: CategoryFormValues): CategoryFormResult {
  const parsed = createCategoryRequestSchema.safeParse(values);
  if (parsed.success) return { ok: true, body: parsed.data };

  const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === 'name');
  const tooLong = nameIssue?.code === 'too_big';

  return {
    ok: false,
    errors: { name: tooLong ? 'Use até 40 caracteres.' : 'Dê um nome à categoria.' },
  };
}
