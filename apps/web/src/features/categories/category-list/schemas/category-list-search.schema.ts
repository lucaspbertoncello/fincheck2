import { z } from 'zod';

/**
 * What the Categorias screen keeps in the URL: the tab of the list (`tags` is the Tags part), the
 * "Nova categoria" modal (`?new=category`, which the "+" opens) and the category being edited
 * (`?edit=<id>`). A tag is only created from inside a category, so there is no `?new=tag`.
 */
export const categoryListSearchSchema = z.object({
  filter: z.enum(['expense', 'income', 'archived', 'tags']).catch('expense'),
  new: z.enum(['category']).optional().catch(undefined),
  edit: z.string().min(1).optional().catch(undefined),
});
