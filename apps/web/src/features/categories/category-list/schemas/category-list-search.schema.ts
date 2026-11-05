import { z } from 'zod';

/**
 * What the Categorias screen keeps in the URL: the tab of the list (`tags` is the Tags part), the
 * "Nova categoria" / "Nova tag" modal (`?new=category` / `?new=tag`, which the "+" opens) and the category being edited (`?edit=<id>`).
 */
export const categoryListSearchSchema = z.object({
  filter: z.enum(['expense', 'income', 'archived', 'tags']).catch('expense'),
  new: z.enum(['category', 'tag']).optional().catch(undefined),
  edit: z.string().min(1).optional().catch(undefined),
});
