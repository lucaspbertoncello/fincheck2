import { z } from 'zod';

/**
 * What the Categorias screen keeps in the URL: the tab of the list, the "Nova categoria" modal
 * (`?new=category`, which the "+" opens) and the category being edited (`?edit=<id>`).
 */
export const categoryListSearchSchema = z.object({
  filter: z.enum(['expense', 'income', 'archived']).catch('expense'),
  new: z.literal('category').optional().catch(undefined),
  edit: z.string().min(1).optional().catch(undefined),
});

export type CategoryListSearch = z.infer<typeof categoryListSearchSchema>;
